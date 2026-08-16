# Curadoria brasileira: serviços, disponibilidade e português — design

Data: 2026-08-16
Status: aprovado para virar plano de implementação
Revisa: `2026-08-13-catalogo-streaming-design.md` (seções 5.2, 6.1 e 6.2)

## 1. Objetivo

O app entrega hoje o catálogo do TMDB quase cru, e isso produz três atritos que
contrariam a premissa do produto — encurtar a indecisão de quem quer assistir
algo hoje, no Brasil:

1. **A lista de serviços é uma parede.** O TMDB conhece 85 provedores de filme
   na região BR. A interface esconde a cauda atrás de um "ver mais", mas ela
   continua lá, e quem abre encontra Cultpix, Jolt Film e Eventive.
2. **A grade mostra filme que não dá para assistir.** Sem serviço marcado,
   nenhum filtro de disponibilidade é aplicado; a home lista títulos que não têm
   distribuição nenhuma no Brasil.
3. **Nada distingue o que está em português.** Um catálogo brasileiro que trata
   filme legendado e filme sem qualquer versão em português como equivalentes.

Este design corrige os três. Ele não muda a arquitetura do app: mexe na camada
de tradução de filtros, acrescenta um módulo de curadoria e um de ordenação, e
apaga um módulo que deixa de fazer sentido.

## 2. Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Origem da lista de serviços | Allowlist curado no código | `display_priority` do TMDB não mede popularidade no Brasil (ver 2.1) |
| Unidade da lista | Serviço, não ID | O TMDB tem entradas irmãs para o mesmo serviço; filtrar por uma só perde catálogo |
| "Estar em algum lugar" | `flatrate`, `free`, `ads`, `rent` ou `buy` na região BR | Leitura literal de "não está em lugar nenhum"; inclui alugar |
| Escopo do portão | Qualquer provedor brasileiro, não só os curados | Ninguém assina Google Play, mas alugar lá conta como disponível |
| Prioridade em português | Desempate na ordenação, sem esconder nada | O sinal é proxy; se ele errar, o custo deve ser posição, não sumiço |
| Onde o desempate vale | Só na descoberta | Na busca a ordem é relevância do termo digitado |
| Portão na busca | Não se aplica | A busca é a válvula de escape que responde "onde está este filme?" |

### 2.1 Por que o allowlist é curado e não calculado

Medido contra a API em 2026-08-16, os quinze primeiros provedores da região BR
por `display_priority` incluem FilmBox+, Sun Nxt, Eventive, Jolt Film e Cultpix.
O **Max aparece na posição 28**. Qualquer corte por top-N teria descartado o Max
e mantido o Cultpix. `display_priority` não é uma medida de popularidade
brasileira, e nenhum ajuste de N conserta isso.

O custo do allowlist é manutenção manual quando o mercado muda. É um custo real
e aceito: o mercado de streaming brasileiro muda em escala de anos, e a lista
tem treze linhas.

### 2.2 Abordagens descartadas

**Filtro rígido de português.** Esconder todo filme sem sinal de pt-BR entrega o
pedido ao pé da letra, mas o sinal é proxy: muito filme mantém o título original
no Brasil e ainda assim chega dublado. O filtro apagaria filme bom com a
confiança de um dado que não temos.

**Portão de disponibilidade na busca.** Exigiria uma consulta de
`/movie/{id}/watch/providers` por resultado — vinte chamadas extras por busca — e
faria a busca responder "nenhum filme encontrado" para um filme que existe e só
não tem distribuição aqui. Resposta enganosa numa tela cujo texto promete dizer
"onde ele está disponível".

**Script de conferência do allowlist contra a API real.** Detectaria um ID
aposentado, mas é infraestrutura que só serve a essa checagem, e a falha que ela
evita é benigna (ver seção 8).

## 3. Escopo

**Dentro:** o allowlist curado e o modelo de serviço com apelidos; o portão de
disponibilidade na descoberta; o desempate em português; a limpeza do módulo de
truncagem de provedores; a higienização do cookie de serviços; os testes
correspondentes.

**Fora:** selo de "dublado" ou "legendado" na interface (o TMDB não tem o dado —
ver 6.3); filtro de idioma manipulável pelo usuário; qualquer mudança na
watchlist, no detalhe do filme ou na busca além do que está descrito aqui.

## 4. O catálogo curado de serviços

### 4.1 O modelo

Módulo novo `src/lib/servicos/populares.ts`, única fonte de verdade sobre quais
serviços o site conhece. Cada entrada é **um serviço como o usuário o entende**,
não um ID do TMDB:

```ts
type ServicoCurado = {
  rotulo: string      // o que aparece na tela
  principal: number   // ID que vai para a URL e de onde vem o logo
  apelidos: number[]  // IDs irmãos que entram junto no filtro
}
```

Três campos, três papéis distintos:

- **`rotulo`** é o nome que a interface mostra. Existe porque o nome do TMDB nem
  sempre serve: `HBO Max` virou Max, e `Telecine Amazon Channel` precisa
  aparecer como Telecine.
- **`principal`** é o ID canônico. Vai para a URL de filtro, identifica a
  entrada no cookie, e é de quem se pega o logo na resposta do TMDB.
- **`apelidos`** são os IDs irmãos do mesmo serviço. Todos entram no
  `with_watch_providers` junto com o principal. Sem isso, marcar Max perderia
  todo filme catalogado apenas sob `HBO Max Amazon Channel`.

A ordem do array é a ordem na tela.

### 4.2 O roster

IDs conferidos contra `/watch/providers/movie?watch_region=BR` em 2026-08-16.

| # | Rótulo | Principal | Apelidos |
|---|---|---|---|
| 1 | Netflix | 8 | 1796 (Standard with Ads) |
| 2 | Prime Video | 119 | 2100 (with Ads) |
| 3 | Max | 1899 | 1825 (Amazon Channel) |
| 4 | Disney+ | 337 | — |
| 5 | Globoplay | 307 | — |
| 6 | Apple TV+ | 350 | — |
| 7 | Paramount+ | 531 | 2303 (Premium), 582 (Amazon Channel) |
| 8 | Telecine | 2156 | — |
| 9 | Crunchyroll | 283 | 1968 (Amazon Channel) |
| 10 | Claro tv+ | 484 | 167 (Claro video) |
| 11 | Looke | 47 | 683 (Amazon Channel) |
| 12 | Pluto TV | 300 | — |
| 13 | MUBI | 11 | 201 (Amazon Channel) |

Notas sobre entradas que **não** estão aqui:

- **Telecine avulso (227) não existe mais na região BR.** Só sobrou o canal via
  Prime Video, e é ele que ocupa a linha do Telecine.
- **Star+ (619) não existe mais**: foi absorvido pelo Disney+ no Brasil.
- **Apple TV Store (2), Google Play Filmes (3) e Amazon Video (10) ficam de
  fora do roster.** São lojas de aluguel e compra, e a pergunta da barra é
  "quais serviços você assina". Elas continuam aparecendo em "Onde assistir" na
  página do filme, e continuam contando para o portão de disponibilidade.

### 4.3 Efeito no código existente

`listarProvedores()` passa a cruzar a resposta do TMDB com o allowlist e a
devolver `Provedor[]` na ordem curada, onde `nome` é o `rotulo`, `id` é o
`principal`, `logo` vem da entrada do TMDB e `prioridade` é o índice na lista
curada. A presença é decidida pelo `principal`: se ele não estiver na resposta
do TMDB, a entrada inteira é omitida — sem erro, sem buraco na interface — ainda
que algum apelido dela esteja presente. Apelido sozinho não vira serviço; ele
existe só para engordar o filtro de quem tem principal.

`prioridade` fica com dois sentidos no código: índice curado na lista de
filtros, `display_priority` do TMDB na disponibilidade do filme
(`obterDisponibilidade`, que continua mostrando todos os provedores reais e não
passa pelo allowlist). Ambos são "ordem de exibição", ambos alimentam
`ordenarProvedores`, e por isso a sobrecarga é inofensiva — mas merece um
comentário no tipo.

**`src/components/filtros/provedores-visiveis.ts` é apagado**, com seus dois
limites e sua função. Junto vão os botões "ver mais N serviços" da
`BarraFiltros` e da `SelecaoServicos`: treze logos não precisam de gaveta, e a
lógica de "serviço marcado nunca some" existia só para consertar a truncagem.

`lerServicosDoCookie()` passa a descartar IDs fora do allowlist. Sem isso, quem
já visitou o site pode ficar com um serviço marcado que não aparece em lugar
nenhum da barra — um filtro ativo e invisível, impossível de desligar.

## 5. O portão de disponibilidade

Uma mudança em `paraQueryTmdb`, mas ela inverte o padrão do app: hoje o filtro
de provedor só existe se o usuário marcar algo; passa a existir sempre.

| Situação | `watch_region` | `with_watch_providers` | `with_watch_monetization_types` |
|---|---|---|---|
| Nenhum serviço marcado | `BR` | ausente | `flatrate\|free\|ads\|rent\|buy` |
| Serviços marcados | `BR` | principais + apelidos dos marcados | `flatrate\|free\|ads` |

A assimetria da monetização é intencional. Sem serviço marcado, a pergunta é
"dá para assistir isto no Brasil de algum jeito?", e alugar conta. Com serviço
marcado, a pergunta virou "dá para assistir isto no que eu já pago?", e aí
oferecer um aluguel de R$ 19,90 é justamente o que o app promete não fazer.

O `with_watch_monetization_types` funciona com `watch_region` sem exigir
`with_watch_providers` — confirmado na referência do endpoint. É isso que
permite o portão sem enumerar provedor nenhum.

Herdam o portão, por passarem todos pelo mesmo `descobrirFilmes`: a home, o
Carregar mais, o Surpreenda-me e a contagem de ganho das sugestões do estado
vazio. **Não** herdam: a busca por título e a Minha Lista.

`variantesAfrouxadas` continua oferecendo "tirar o filtro de serviços" quando a
consulta dá zero. A variante agora afrouxa **até** o portão, nunca além dele: a
sugestão do estado vazio jamais aponta para um filme indisponível.

## 6. O desempate em português

### 6.1 O sinal

Sai de graça da resposta que já pedimos. O cliente envia `language=pt-BR` em
toda chamada, e o TMDB devolve `overview` vazio quando não existe tradução —
comportamento que o código já conhece e explora ao buscar a sinopse original em
`obterFilme`. Nenhuma requisição extra.

| Sinal | Pontos | Por quê |
|---|---|---|
| `original_language === 'pt'` | +2 | Falado em português; não depende de dublagem nenhuma |
| `title` presente e diferente de `original_title` | +1 | Título brasileiro existe, logo houve lançamento comercial aqui |
| `overview` não vazio | +1 | Existe tradução pt-BR no TMDB |

`original_language` é campo que o `/discover` já devolve e que `FilmeCru` hoje
ignora; entra em `tipos-crus.ts`.

### 6.2 Onde vive

Módulo novo `src/lib/tmdb/portugues.ts`, com uma função pura de pontuação e uma
de ordenação sobre o filme cru. A ordenação é **estável e decrescente**, chamada
explicitamente dentro de `descobrirFilmes` — e não dentro de `paraPagina`, para
que `buscarPorTitulo` não a herde por acidente.

A estabilidade é requisito, não detalhe: dentro de uma mesma faixa de pontuação
a ordem que o usuário pediu (popularidade, nota ou lançamento) continua
mandando. O desempate nunca reordena filmes empatados no sinal.

O tipo `Filme` **não ganha campo nenhum**. A pontuação é política de ordenação,
morre na camada do TMDB, e como não há selo na interface, não há nada que o card
precise saber.

### 6.3 Limites declarados

**O TMDB não tem dado de dublagem nem de legenda.** Confirmado na referência do
`/discover/movie`: não existe parâmetro de idioma de áudio ou de legenda; o que
existe é `with_original_language`, que é outra coisa, e `language`, que só
traduz metadados. Por isso a interface **não** exibe selo de "Dublado" nem de
"Legendado" — seria uma promessa que não podemos cumprir.

**É desempate local, não global.** Reordena os vinte resultados da página. Um
filme em português que o TMDB colocou na página 4 não sobe para a página 1;
fazê-lo exigiria baixar o catálogo inteiro.

**O portão já entrega boa parte do pedido.** Catálogo licenciado no Brasil é
legendado em português por padrão. O desempate é um reforço em cima disso, não o
mecanismo principal.

## 7. Efeito nas telas

| Tela | O que muda |
|---|---|
| Primeira visita | Treze logos, ordem curada, sem "ver todos" |
| Home | Grade só com filme disponível no Brasil; filmes em português primeiro dentro de cada página |
| Barra de filtros | Treze serviços, todos visíveis, sem "ver mais" |
| Destaque | Continua sendo o primeiro resultado com arte de fundo, agora **depois** do desempate — tende a ficar em português |
| Surpreenda-me | Sorteia dentro do universo já filtrado pelo portão |
| Estado vazio | Sugestões nunca apontam para filme indisponível |
| Busca | Sem mudança: acha qualquer filme, com ou sem streaming |
| Detalhe do filme | Sem mudança: "Onde assistir" continua mostrando todos os provedores reais, lojas de aluguel inclusive |
| Minha lista | Sem mudança |

O comentário sobre o destaque em `src/app/page.tsx` afirma que ele é "o primeiro
resultado da própria consulta". Precisa ser corrigido junto com o código: passa
a ser o primeiro resultado **como o site o apresenta**. Deixá-lo como está
transformaria um comentário verdadeiro em mentira.

## 8. Riscos assumidos

**ID aposentado pelo TMDB.** Se um serviço mudar de ID, como já aconteceu com o
Telecine avulso, ele some da barra em silêncio. O grau de falha é benigno: o
site continua de pé com um serviço a menos, e ninguém fica com filtro quebrado.
Aceito sem mitigação, pelos motivos em 2.2.

**Proxy de português erra nos dois sentidos.** Filme dublado que manteve o
título original pontua baixo; filme sem versão brasileira mas com sinopse
traduzida por voluntário pontua alto. Como a decisão é desempate e não filtro, o
custo do erro é uma posição na grade.

**O portão depende de a cobertura do JustWatch estar completa.** Filme
disponível no Brasil que o JustWatch não catalogou desaparece da descoberta. É a
mesma dependência que o app já tem para tudo mais que envolve provedores, e a
busca continua achando o filme.

## 9. Testes

Todos sem rede, exceto o e2e, que roda contra o TMDB falso.

| Alvo | O que provar |
|---|---|
| `servicos/populares` | Nenhum ID repetido entre principal e apelidos de serviços diferentes; roster não vazio |
| `listarProvedores` | Provedor fora do allowlist é descartado; ordem é a curada; rótulo curado vence o nome do TMDB; entrada ausente no TMDB não quebra |
| `paraQueryTmdb` | Portão presente em toda consulta; monetização troca conforme haja ou não serviço marcado; apelidos entram no `with_watch_providers` |
| `portugues` | Pontuação de cada sinal e da soma; ordem decrescente; **estabilidade** no empate |
| `lerServicosDoCookie` | ID fora do allowlist é descartado |
| `BarraFiltros`, `SelecaoServicos` | Todos os serviços aparecem; não existe mais botão de "ver mais" |
| e2e | Provedor de nicho não aparece em nenhuma das telas de filtro |

O TMDB falso (`test/mock-tmdb/servidor.mjs`) hoje serve só Netflix e Prime,
ambos no allowlist — sobreviveriam ao corte sem provar nada. Ele ganha um
provedor fora do allowlist (Cultpix, 692) para o e2e mostrar que ele não
aparece, e os filmes ganham `original_language` e variação de título e sinopse
para o desempate ter o que ordenar.

Saem os casos de "ver mais N serviços" em `BarraFiltros.test.tsx` e
`SelecaoServicos.test.tsx`, junto com o módulo que eles cobriam.

## 10. Documentação a atualizar

- **README**: a descrição dos filtros e da seleção de serviços.
- **`2026-08-13-catalogo-streaming-design.md`**: seções 5.2 (regras de tradução
  dos filtros), 6.1 (primeira visita) e 6.2 (home). Ganham uma nota de remissão
  para este documento em vez de serem reescritas — o spec antigo registra por
  que o app foi feito assim, e esse histórico tem valor.
