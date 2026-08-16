# CineOdiados

Catálogo de filmes disponíveis nos serviços de streaming que você assina no Brasil,
com filtros que vivem na URL e um botão que sorteia um filme entre **todos** os
resultados do filtro — não só entre os que estão visíveis na tela.

Projeto de portfólio construído com Next.js (App Router), TypeScript e Tailwind,
consumindo a [API do TMDB](https://developer.themoviedb.org/docs). Sem backend
próprio: nenhuma conta de usuário, nenhum banco de dados.

## Como rodar

**Isto é o único passo que ninguém além de você pode fazer por você:** o app não
inicia sem uma credencial do TMDB.

1. Crie uma conta gratuita em [themoviedb.org](https://www.themoviedb.org/) e, em
   [Configurações da conta → API](https://www.themoviedb.org/settings/api), peça
   acesso à API. O TMDB pede uma finalidade de uso e aprova o pedido manualmente —
   não é instantâneo. Depois de aprovado, copie o **API Read Access Token** (o
   token longo, não a "API Key" curta).
2. `cp .env.example .env.local` e cole o token em `TMDB_READ_TOKEN`.
3. `npm install`
4. `npm run dev` e abra <http://localhost:3000>.

Sem o token, qualquer chamada ao TMDB falha em tempo de execução — o app builda
normalmente (nenhuma página busca dados do TMDB durante o build), mas nenhuma tela
que dependa de filmes carrega.

## Comandos

Comandos reais, tirados do `package.json`:

| Comando | O que faz |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir (`tsc --noEmit`) |
| `npm run test` | Testes unitários e de componente (Vitest) |
| `npm run test:e2e` | Teste de fumaça ponta a ponta (Playwright) |

`npm run test:e2e` **não precisa de `TMDB_READ_TOKEN` nem de rede**: o
`playwright.config.ts` sobe um servidor TMDB falso local
(`test/mock-tmdb/servidor.mjs`) antes do app e aponta `TMDB_BASE_URL` para ele,
com um token fictício. É uma escolha deliberada — o teste de fumaça cobre o fluxo
inteiro (escolher serviços, filtrar, sortear, abrir detalhe, salvar na watchlist)
sem depender da disponibilidade da API real nem gastar cota dela, e roda igual no
CI e localmente sem segredo nenhum.

## Decisões de arquitetura

- **A chave do TMDB nunca chega ao navegador, e isso é garantido no build, não
  por convenção.** Toda chamada ao TMDB sai de `src/lib/tmdb/cliente.ts`, que
  importa `server-only` logo na primeira linha. Se algum dia um Client Component
  importar esse módulo (direta ou indiretamente), o build falha — não é uma regra
  que depende de alguém lembrar de não fazer isso em code review.
- **Os filtros vivem na URL.** `src/lib/filtros` lê e escreve os parâmetros de
  busca; não há estado de filtro duplicado em React. O botão voltar funciona,
  qualquer combinação de filtros é um link compartilhável, e a primeira pintura
  do servidor já vem com o resultado certo.
- **Sem backend.** Os serviços de streaming assinados ficam num cookie
  (`src/lib/preferencias/servicos-servidor.ts`), para o Server Component
  conseguir ler a preferência já na primeira renderização — sem isso, a home
  piscaria sem filtro algum antes de aplicar a escolha do usuário no cliente. A
  watchlist mora só no `localStorage` (`src/lib/preferencias/watchlist.ts`): nunca
  precisa ser lida no servidor nem trafegar em toda requisição.
- **O sorteio ("Surpreenda-me") percorre todas as páginas do resultado, não só a
  visível.** A rota `/api/sortear` pede a primeira página do filtro atual só para
  saber quantas páginas existem no total (até o teto de 500 que a API do TMDB
  impõe), usa `src/lib/sorteio` para sortear uma página e um índice dentro dela, e
  então busca essa página específica. Sortear só entre os 20 filmes já carregados
  na tela devolveria sempre os mesmos títulos populares.
- **Nova tentativa em erro 429.** `buscarTmdb` (`src/lib/tmdb/cliente.ts`) repete
  a mesma requisição até duas vezes (esperando 300ms e depois 900ms) antes de
  desistir e propagar o erro; qualquer outro código de erro falha na hora, sem
  repetir.

## Atribuição

Dois avisos que o rodapé mostra em toda página — exigência dos termos de uso da
API, não uma cortesia:

- Os dados de disponibilidade em streaming (onde assistir cada filme) vêm da
  **JustWatch**, que os fornece através da API do TMDB.
- Este produto usa a API do TMDB, mas não é endossado, certificado ou aprovado
  pelo TMDB. O rodapé também exibe o logotipo oficial do TMDB
  (`public/tmdb.svg`), como a atribuição exige.

## Deploy

O projeto foi desenhado para a Vercel (runtime serverless gratuito, integrado ao
Next.js), mas não tem infraestrutura própria — qualquer plataforma que rode
Next.js serve. Ao publicar, cadastre `TMDB_READ_TOKEN` nas variáveis de ambiente
do projeto. Não cadastre `TMDB_BASE_URL`: a ausência dela faz o cliente cair no
padrão (`https://api.themoviedb.org/3`, a API real); essa variável só existe para
o teste de ponta a ponta apontar para o servidor falso.

## Mais contexto

A decisão de design completa — por que Next.js, por que cookie em vez de conta de
usuário, o que foi descartado e por quê — está em
[`docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md`](docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md).
