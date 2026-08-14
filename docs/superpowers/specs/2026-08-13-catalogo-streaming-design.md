# Catálogo de filmes em streaming — design

Data: 2026-08-13
Status: aprovado para virar plano de implementação

## 1. Objetivo

Um app web que responde a uma pergunta: **o que eu assisto hoje, dentro dos
serviços de streaming que eu já assino?**

Não é um catálogo genérico de filmes. O produto existe para encurtar a
indecisão. Toda escolha de escopo abaixo serve a isso: filtros que valem a pena
mexer, um sorteio que devolve algo de verdade novo, e o mínimo de atrito entre
abrir o site e ter um título na tela.

O projeto é de portfólio e aprendizado. Isso tem duas consequências práticas: a
qualidade do código e da interface é parte do entregável, e a infraestrutura
precisa custar zero.

## 2. Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Plataforma | Web responsiva, Next.js App Router | URL pública que se manda para qualquer pessoa; o formato de portfólio com menos atrito |
| Linguagem | TypeScript | Contratos entre módulos verificados no build |
| Estilo | Tailwind | Iteração visual rápida sem sair do componente |
| Origem dos dados | TMDB API (dados de streaming via JustWatch) | Único fornecedor gratuito com cobertura de provedores no Brasil |
| Região | `BR`, interface em `pt-BR` | Público-alvo; `watch_region` é obrigatório ao filtrar por provedor |
| Backend próprio | Nenhum | Sem contas de usuário, sem banco, sem custo |
| Chave da API | Só no servidor | Route Handlers e Server Components fazem as chamadas; a chave nunca entra no bundle |
| Estado dos filtros | Na URL | Botão voltar funciona, filtro vira link compartilhável, primeira pintura já vem com conteúdo |
| Serviços assinados | Cookie de preferência | O Server Component precisa enxergar na primeira renderização, senão a home pisca sem filtro |
| Watchlist | `localStorage` | Nunca é lida no servidor; não precisa trafegar em toda requisição |
| Hospedagem | Vercel | Runtime serverless gratuito, integrado ao Next |

### Abordagens descartadas

**SPA pura (Vite) com a chave no cliente.** Mais simples de hospedar, mas expõe
o token do TMDB no bundle — qualquer visitante o extrai pelo DevTools. Num
projeto cujo propósito é demonstrar competência técnica, é o tipo de detalhe que
conta contra.

**Catálogo pré-gerado em JSON no build.** Deixaria filtros e sorteio
instantâneos, sem tocar na API a cada interação. Descartada porque o catálogo
brasileiro tem milhares de títulos por serviço, envelhece em dias, e manter o
pipeline de geração é complexidade que não serve ao objetivo. A parte boa da
ideia — reduzir chamadas repetidas — foi absorvida pela estratégia de cache do
Next.

## 3. Escopo

**Dentro:**

- Seleção dos serviços de streaming assinados (primeira visita e depois editável)
- Descoberta filtrada por serviço, gênero, nota mínima, duração máxima e período
- Sorteio "Surpreenda-me" entre **todos** os resultados do filtro
- Página de detalhe do filme com elenco, trailer e onde assistir
- Busca por título
- Watchlist local
- Atribuição a TMDB e JustWatch

**Fora (candidatos a v2):** séries, contas de usuário e sincronização entre
dispositivos, recomendações personalizadas por histórico, notificações de
lançamento, suporte a outras regiões além do Brasil.

## 4. Arquitetura

### 4.1 Camadas

```
app/
  layout.tsx                 cabeçalho, rodapé de atribuição
  page.tsx                   home: filtros + grade (Server Component)
  filme/[id]/page.tsx        detalhe
  busca/page.tsx             resultados de busca por título
  minha-lista/page.tsx       watchlist (Client Component)
  api/
    sortear/route.ts         devolve um filme aleatório dentro dos filtros
    descobrir/route.ts       páginas seguintes do "carregar mais"
lib/
  tmdb/                      cliente HTTP, tipos crus, mapeadores  [server-only]
  filtros/                   URL <-> filtros <-> query TMDB        [puro]
  sorteio/                   escolha aleatória com RNG injetado    [puro]
  preferencias/              cookie de serviços, localStorage da watchlist
components/
  filtros/                   barra de filtros, chips de serviço, estado vazio
  filme/                     card, grade, painel de sorteio, bloco "onde assistir"
  ui/                        primitivos compartilhados
```

**Regra de dependência:** `components/` e `app/` dependem de `lib/`; `lib/`
nunca depende deles. `lib/filtros` e `lib/sorteio` não importam nada de rede nem
de React — são funções puras, e é onde mora a maior parte da lógica testável.

**Isolamento da API.** `lib/tmdb` é o único módulo que conhece o formato do
TMDB. Ele exporta funções de domínio e **mapeia** as respostas cruas para tipos
próprios antes de devolvê-las. Nenhum componente vê `poster_path`,
`vote_average` ou `results`. Se o TMDB mudar um campo, muda um arquivo.

**Garantia de segredo.** `lib/tmdb` importa o pacote `server-only`. Se alguém
importar o cliente a partir de um Client Component, o **build falha**. A proteção
da chave é verificada pelo compilador, não confiada à disciplina de quem escreve.

### 4.2 Tipos de domínio

```ts
type Filme = {
  id: number
  titulo: string
  sinopse: string | null        // null quando não há tradução pt-BR nem original
  poster: string | null         // URL completa, já montada
  backdrop: string | null
  nota: number                  // 0–10
  votos: number
  ano: number | null
  duracaoMin: number | null     // só vem no detalhe
  generos: Genero[]
}

type Provedor = { id: number; nome: string; logo: string; prioridade: number }

type Disponibilidade = {
  assinatura: Provedor[]
  aluguel: Provedor[]
  compra: Provedor[]
  gratis: Provedor[]            // free + ads
  linkJustWatch: string | null
}

type Filtros = {
  servicos: number[]            // provider ids
  generos: number[]
  notaMinima: number | null     // 0–10
  duracaoMaxMin: number | null
  anoDe: number | null
  anoAte: number | null
  ordenacao: 'popularidade' | 'nota' | 'lancamento'
  pagina: number                // 1–500
}
```

### 4.3 Contratos de módulo

**`lib/tmdb`** (todas as funções assíncronas, todas server-only):

- `descobrirFilmes(filtros: Filtros): Promise<{ filmes: Filme[]; totalPaginas: number; totalResultados: number }>`
- `obterFilme(id: number): Promise<FilmeDetalhado>` — inclui elenco e trailer
- `obterDisponibilidade(id: number): Promise<Disponibilidade>`
- `listarProvedores(): Promise<Provedor[]>`
- `listarGeneros(): Promise<Genero[]>`
- `buscarPorTitulo(q: string, pagina: number): Promise<{ filmes: Filme[]; totalPaginas: number }>`

**`lib/filtros`** (puro):

- `lerFiltros(searchParams, servicosPadrao: number[]): Filtros` — valida com zod;
  qualquer valor inválido cai no padrão em vez de lançar erro
- `escreverFiltros(filtros: Filtros): URLSearchParams` — omite valores no padrão,
  para a URL não ficar poluída
- `paraQueryTmdb(filtros: Filtros): Record<string, string>` — aplica as regras da
  seção 5.2

**`lib/sorteio`** (puro):

- `escolherAlvo(totalPaginas: number, itensUltimaPagina: number, rng: () => number): { pagina: number; indice: number }`

**`lib/preferencias`:**

- `lerServicos(): number[]` / `salvarServicos(ids: number[])` — cookie
- `lerWatchlist(): ItemWatchlist[]` / `alternarWatchlist(filme)` — `localStorage`

### 4.4 Fluxo de dados

**Home.** O Server Component lê `searchParams` e o cookie de serviços,
chama `lerFiltros` e depois `descobrirFilmes`, e renderiza a grade já filtrada.
Mexer num filtro no cliente apenas reescreve a URL (`router.push`, sem rolar a
página); o servidor re-renderiza a grade. Nenhum estado de filtro é duplicado em
React — a URL é a única fonte de verdade.

**Carregar mais.** O botão chama `GET /api/descobrir?<filtros>&pagina=N`, que
devolve os filmes já mapeados e os acrescenta à grade no cliente. A primeira
página continua vindo do servidor; só as seguintes são client-side.

**Surpreenda-me.** `GET /api/sortear?<filtros>` executa:

1. `descobrirFilmes` com `pagina=1` para obter `totalPaginas` e `totalResultados`
   (resposta cacheável).
2. `escolherAlvo` sorteia uma página em `[1, min(totalPaginas, 500)]` e um índice
   dentro dela.
3. Busca a página sorteada e devolve o filme daquele índice.

Sortear entre todos os resultados, e não entre os 20 visíveis, é o que impede o
botão de devolver sempre os mesmos populares. O passo 2 é uma função pura com o
gerador aleatório recebido por parâmetro — testável de forma determinística.

## 5. Integração com o TMDB

### 5.1 Endpoints usados

| Uso | Endpoint |
|---|---|
| Descoberta filtrada | `GET /3/discover/movie` |
| Detalhe + elenco + trailer | `GET /3/movie/{id}?append_to_response=credits,videos` |
| Onde assistir | `GET /3/movie/{id}/watch/providers` |
| Lista de serviços no BR | `GET /3/watch/providers/movie?watch_region=BR` |
| Lista de gêneros | `GET /3/genre/movie/list` |
| Busca por título | `GET /3/search/movie` |

Autenticação por *read access token* no header `Authorization: Bearer`. Todas as
chamadas levam `language=pt-BR`. Imagens vêm de `https://image.tmdb.org/t/p/`,
com `w342` na grade e `w780` no backdrop.

### 5.2 Regras de tradução dos filtros

- `watch_region=BR` **sempre** que houver filtro de provedor — a API exige.
- `with_watch_monetization_types=flatrate` — "eu assino esse serviço" significa
  incluído na assinatura, não disponível para aluguel.
- `with_watch_providers` com os ids separados por `|` (OU lógico): o filme
  precisa estar em **algum** dos serviços assinados, não em todos.
- `with_genres` separado por `,` (E lógico) quando mais de um gênero é escolhido.
- `vote_count.gte=100` sempre que houver nota mínima ou ordenação por nota. Sem
  esse piso, filmes com um único voto 10 sobem ao topo e a nota perde sentido.
- `with_runtime.lte` para duração máxima; `primary_release_date.gte/.lte` para o
  período.
- `page` limitado a 500 — teto da API.

### 5.3 Cache

Descoberta e busca revalidam a cada 15 minutos. Lista de provedores e de gêneros,
que praticamente não mudam, revalidam a cada 24 horas. Detalhe e
disponibilidade de um filme revalidam a cada 6 horas. Isso mantém o app
confortavelmente abaixo do limite de ~40 requisições por segundo do TMDB e deixa
a navegação instantânea. Nenhum dado é armazenado além do cache HTTP do Next —
os termos do TMDB proíbem cache com mais de 6 meses, e não chegamos perto disso.

### 5.4 Conformidade

Ambas as atribuições ficam no rodapé, em todas as páginas:

- **JustWatch**, exigência literal da documentação: *"In order to use this data
  you must attribute the source of the data as JustWatch. If we find any usage
  not complying with these terms we will revoke access to the API."*
- **TMDB**, com logo e a frase dos termos de uso: *"This product uses the TMDB
  API but is not endorsed, certified, or otherwise approved by TMDB."* O logo do
  TMDB deve aparecer com menos destaque que a identidade do próprio app.

O TMDB não fornece link direto para o app de cada serviço. O botão de assistir
leva ao `link` do JustWatch devolvido pela API — é o destino honesto disponível.
O projeto não gera receita, o que o mantém dentro do uso não comercial permitido.

## 6. Telas

### 6.1 Primeira visita

Grade com os logos dos serviços disponíveis no Brasil, vinda de
`watch/providers/movie` — nada chumbado no código. Seleção múltipla, botão
"ver filmes", cookie gravado. Sem cadastro e sem tutorial. Quem pular a seleção
vê o catálogo sem filtro de serviço, e os chips no topo continuam disponíveis.

### 6.2 Home

Barra de filtros fixa no topo (gaveta no celular): serviços, gêneros, nota
mínima, duração máxima, período, ordenação. Ao lado, com peso visual
deliberadamente maior, o botão **Surpreenda-me**. Abaixo, a grade de pôsteres com
"carregar mais".

**Estado vazio.** Com filtros fortes ele vai acontecer bastante, então não pode
ser um beco sem saída: o app identifica qual filtro está mais restritivo e
oferece afrouxá-lo com um clique — *"nota mínima 8 está deixando 40 filmes de
fora — baixar para 7?"*. A heurística é simples e suficiente: refazer a contagem
sem cada filtro, um de cada vez, e sugerir aquele cuja remoção libera mais
resultados.

### 6.3 Resultado do sorteio

Painel dedicado sobre a home: pôster grande, nota, sinopse, onde assistir, e dois
caminhos — "sortear de novo" e "ver detalhes". É a tela mais vista do app; é onde
vale gastar capricho de animação e de estado de carregamento.

### 6.4 Detalhe do filme — `/filme/[id]`

Backdrop, sinopse, elenco principal, duração, gêneros, trailer quando existir, e
o bloco **Onde assistir** separando assinatura, aluguel, compra e grátis (que
reúne os gratuitos e os com anúncios) com os logos dos serviços. Grupos vazios
não aparecem. Botão para o link do JustWatch. Botão de salvar na watchlist.

### 6.5 Busca — `/busca?q=`

Campo no cabeçalho, resultados em grade, clique leva ao detalhe. A busca
**não** aplica o filtro de serviços assinados: quem procura um título específico
quer saber onde ele está, inclusive fora dos seus serviços.

### 6.6 Minha lista — `/minha-lista`

Os filmes salvos, lidos do `localStorage`. Guarda apenas id, título e pôster —
o suficiente para renderizar sem estourar o armazenamento.

### 6.7 Regras transversais

Sinopse cai para o texto em inglês quando não há tradução em `pt-BR` (comum em
filmes fora do circuito); se não houver nenhuma, o bloco some em vez de mostrar
espaço vazio. Pôsteres usam `next/image` com um espaço reservado desenhado para
os filmes sem imagem. Navegação por teclado funciona em toda a barra de filtros,
o foco é visível, e o `alt` de cada pôster é o título do filme.

## 7. Falhas

| Situação | Comportamento |
|---|---|
| `429` do TMDB | Duas novas tentativas com espera crescente na camada de cliente; persistindo, erro amigável com botão de tentar de novo |
| `5xx` ou rede fora | `error.tsx` por rota; a home nunca fica em branco |
| Id de filme inexistente | `notFound()` → página 404 própria |
| Filme sem streaming no BR | "Não disponível em streaming no Brasil no momento" — a ausência é a informação, o bloco não some |
| Parâmetro inválido na URL | zod cai no valor padrão; a página renderiza normalmente |
| Sorteio sem resultados | Painel explica que nenhum filme atende aos filtros e oferece afrouxar, igual ao estado vazio |
| Página acima de 500 | Filtros e sorteio limitam antes de chamar; "carregar mais" some ao atingir o teto |
| `TMDB_READ_TOKEN` ausente | Erro claro na inicialização, apontando o `.env.example` |

## 8. Testes

**Vitest, no núcleo:**

- `lib/filtros`: URL → `Filtros` → query TMDB, cobrindo `watch_region`,
  `flatrate`, o `|` dos provedores, o piso de `vote_count`, o teto de 500 páginas
  e valores inválidos caindo no padrão
- `lib/sorteio`: gerador determinístico; limites (uma página, teto de 500,
  última página incompleta, zero resultados)
- `lib/tmdb`: com MSW interceptando — mapeamento das respostas, caminho do `429`
  com nova tentativa, ausência de tradução

**Testing Library, na interface:** mexer num filtro reescreve a URL; o estado
vazio aponta o filtro que mais libera resultados.

**Playwright, um teste de fumaça:** escolher serviços → filtrar → sortear →
abrir detalhe → salvar na lista.

**GitHub Actions:** lint, typecheck, unitários e end-to-end a cada PR.

## 9. Configuração e deploy

`TMDB_READ_TOKEN` em `.env.local` no desenvolvimento e nas variáveis de ambiente
da Vercel em produção. `.env.example` versionado. O README explica como obter a
chave — o TMDB exige conta e aprovação de uso, então quem clonar o projeto
precisa desse passo antes de rodar.
