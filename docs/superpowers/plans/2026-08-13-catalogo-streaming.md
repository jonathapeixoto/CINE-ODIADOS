# Catálogo de filmes em streaming — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um app web que mostra quais filmes estão disponíveis nos serviços de streaming que a pessoa assina no Brasil, com filtros e um sorteio para resolver a indecisão.

**Architecture:** Next.js App Router com a chave do TMDB apenas no servidor: Server Components e Route Handlers fazem todas as chamadas à API. Os filtros vivem na URL e são a única fonte de verdade; os serviços assinados ficam num cookie (para o servidor enxergá-los na primeira renderização) e a watchlist no `localStorage`. Nenhum backend próprio, nenhum banco.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, zod, Vitest + Testing Library + MSW, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md`

**Refinamento sobre a spec:** o tipo `Filme` da spec foi dividido em `Filme` (o que o `discover` devolve) e `FilmeDetalhado` (acrescenta duração, gêneros, elenco e trailer). O `discover` do TMDB só devolve `genre_ids`, sem os nomes dos gêneros, e resolver isso por card custaria uma chamada extra por filme. A spec já previa `obterFilme(id): Promise<FilmeDetalhado>`.

**Direção visual:** as tarefas de interface (7 em diante) devem usar a skill `frontend-design` antes de escrever o JSX. Este plano define estrutura, comportamento e testes — não a estética.

## Global Constraints

Valores copiados da spec. Valem para todas as tarefas.

- Região fixa: `watch_region=BR`. Idioma de todas as chamadas: `language=pt-BR`.
- Filtro de provedor sempre acompanhado de `with_watch_monetization_types=flatrate`.
- Ids de provedores unidos por `|` (OU). Ids de gêneros unidos por `,` (E).
- `vote_count.gte=100` sempre que houver nota mínima ou ordenação por nota.
- Teto de 500 páginas no `discover` — vale para paginação e para o sorteio.
- Revalidação: descoberta e busca 15 min (900 s); detalhe e disponibilidade 6 h (21600 s); listas de provedores e gêneros 24 h (86400 s).
- A chave do TMDB nunca pode chegar ao cliente. `src/lib/tmdb/` importa `server-only`.
- Rodapé em todas as páginas com as duas atribuições obrigatórias:
  - `Dados de disponibilidade em streaming fornecidos por JustWatch.`
  - `Este produto usa a API do TMDB, mas não é endossado, certificado ou aprovado pelo TMDB.` (tradução da frase exigida nos termos: *"This product uses the TMDB API but is not endorsed, certified, or otherwise approved by TMDB."*)
- O logo do TMDB deve aparecer no rodapé com menos destaque que a identidade do app. **Passo manual do humano:** baixar o logo em <https://www.themoviedb.org/about/logos-attribution> e salvar como `public/tmdb.svg`. Até isso acontecer, o rodapé mostra o texto alternativo — a Tarefa 17 cobra esse passo.
- Sem backend, sem contas de usuário, sem banco de dados.
- Versões: manter os majors deste plano (`next@^15`, `react@^19`, `tailwindcss@^4`, `zod@^3`, `vitest@^3`, `msw@^2`). Se o gerenciador resolver um major diferente, corrigir para o pinado antes de seguir.

## Estrutura de arquivos

```
src/
  app/
    layout.tsx                  cabeçalho + rodapé de atribuição
    globals.css
    page.tsx                    home: seleção de serviços OU filtros + grade
    error.tsx                   erro de rota com botão de tentar de novo
    not-found.tsx
    filme/[id]/page.tsx         detalhe
    busca/page.tsx              resultados de busca por título
    minha-lista/page.tsx        watchlist
    api/descobrir/route.ts      páginas seguintes do "carregar mais"
    api/sortear/route.ts        um filme aleatório dentro dos filtros
  lib/
    constantes.ts               REGIAO, IDIOMA, MAX_PAGINAS, MIN_VOTOS, REVALIDATE
    tipos.ts                    tipos de domínio
    filtros/
      esquema.ts                validação zod dos valores escalares
      ler.ts                    lerFiltros
      escrever.ts               escreverFiltros
      query.ts                  paraQueryTmdb
      afrouxar.ts               variantes com um filtro removido
      index.ts                  reexporta o módulo
    sorteio/index.ts            escolherAlvo, itensNaUltimaPagina
    tmdb/
      cliente.ts                buscarTmdb, ErroTmdb            [server-only]
      tipos-crus.ts             formato das respostas do TMDB
      mapeadores.ts             cru -> domínio
      index.ts                  funções de domínio
      sugestoes.ts              sugerirAfrouxamento
    preferencias/
      servicos.ts               codificar/decodificar cookie (puro)
      servicos-servidor.ts      lerServicosDoCookie             [server-only]
      servicos-cliente.ts       salvarServicos (document.cookie)
      watchlist.ts              localStorage
  components/
    layout/Rodape.tsx, Cabecalho.tsx
    filtros/BarraFiltros.tsx, SelecaoServicos.tsx, EstadoVazio.tsx
    filme/CardFilme.tsx, GradeFilmes.tsx, CarregarMais.tsx,
          BotaoSurpreendaMe.tsx, PainelSorteio.tsx, OndeAssistir.tsx,
          BotaoWatchlist.tsx
test/
  setup.tsx                     mocks globais (next/image)
  stubs/server-only.ts          stub para o Vitest
  mock-tmdb/servidor.mjs        API falsa usada no end-to-end
  mock-tmdb/fixtures/*.json
e2e/fluxo.spec.ts
```

**Regra de dependência:** `app/` e `components/` dependem de `lib/`; `lib/` nunca depende deles. `lib/filtros` e `lib/sorteio` são puros — sem rede, sem React.

---

### Task 1: Esqueleto do projeto e ferramentas

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/constantes.ts`, `test/setup.tsx`, `test/stubs/server-only.ts`
- Test: `src/lib/constantes.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `REGIAO: 'BR'`, `IDIOMA: 'pt-BR'`, `MAX_PAGINAS: 500`, `MIN_VOTOS: 100`, `ITENS_POR_PAGINA: 20`, `REVALIDATE: { descoberta: 900; busca: 900; filme: 21600; disponibilidade: 21600; listas: 86400 }`, `BASE_TMDB_PADRAO: 'https://api.themoviedb.org/3'`. Alias `@/*` → `src/*`. Scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "catalogo-streaming",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "server-only": "^0.0.1",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.1.0",
    "@playwright/test": "^1.47.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "jsdom": "^25.0.0",
    "msw": "^2.4.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Criar os arquivos de configuração**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    // Nos testes end-to-end a API é falsa e não há imagens reais para otimizar.
    unoptimized: process.env.E2E === '1',
    remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org' }],
  },
}

export default config
```

`postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`eslint.config.mjs`:

```js
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

export default [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]
```

`vitest.config.ts` — o alias de `server-only` é obrigatório: o pacote real lança erro quando importado fora da condição `react-server`, o que quebraria todo teste que toque em `lib/tmdb`.

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.tsx'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './test/stubs/server-only.ts'),
    },
  },
})
```

`.gitignore`:

```
node_modules
.next
out
coverage
playwright-report
test-results
.env.local
next-env.d.ts
```

`.env.example`:

```
# Read Access Token do TMDB (Configurações da conta > API > API Read Access Token)
TMDB_READ_TOKEN=
# Só para testes: aponta o cliente para uma API falsa
TMDB_BASE_URL=https://api.themoviedb.org/3
```

- [ ] **Step 3: Criar o suporte de teste**

`test/stubs/server-only.ts`:

```ts
// O pacote real lança erro fora do runtime de servidor do Next.
// Nos testes ele não precisa fazer nada.
export {}
```

`test/setup.tsx`:

```tsx
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import type { ImgHTMLAttributes } from 'react'

// next/image depende do runtime do Next; no jsdom basta uma <img>.
vi.mock('next/image', () => ({
  default: ({ src, alt, ...resto }: ImgHTMLAttributes<HTMLImageElement>) => (
    <img src={typeof src === 'string' ? src : ''} alt={alt} {...resto} />
  ),
}))
```

- [ ] **Step 4: Escrever o teste das constantes**

`src/lib/constantes.test.ts` — estas constantes são exigências da API e da spec; o teste existe para que ninguém as mude sem perceber.

```ts
import { describe, expect, it } from 'vitest'
import {
  IDIOMA,
  ITENS_POR_PAGINA,
  MAX_PAGINAS,
  MIN_VOTOS,
  REGIAO,
  REVALIDATE,
} from '@/lib/constantes'

describe('constantes', () => {
  it('fixa a região e o idioma exigidos pela spec', () => {
    expect(REGIAO).toBe('BR')
    expect(IDIOMA).toBe('pt-BR')
  })

  it('respeita os limites do discover do TMDB', () => {
    expect(MAX_PAGINAS).toBe(500)
    expect(ITENS_POR_PAGINA).toBe(20)
  })

  it('mantém o piso de votos que dá sentido à nota mínima', () => {
    expect(MIN_VOTOS).toBe(100)
  })

  it('usa as janelas de revalidação da spec', () => {
    expect(REVALIDATE).toEqual({
      descoberta: 900,
      busca: 900,
      filme: 21600,
      disponibilidade: 21600,
      listas: 86400,
    })
  })
})
```

- [ ] **Step 5: Rodar o teste e ver falhar**

Run: `npm install && npx vitest run src/lib/constantes.test.ts`
Expected: FAIL — não consegue resolver `@/lib/constantes`.

- [ ] **Step 6: Escrever as constantes**

`src/lib/constantes.ts`:

```ts
export const REGIAO = 'BR'
export const IDIOMA = 'pt-BR'
export const MAX_PAGINAS = 500
export const MIN_VOTOS = 100
export const ITENS_POR_PAGINA = 20
export const BASE_TMDB_PADRAO = 'https://api.themoviedb.org/3'

export const REVALIDATE = {
  descoberta: 900,
  busca: 900,
  filme: 21600,
  disponibilidade: 21600,
  listas: 86400,
} as const
```

- [ ] **Step 7: Rodar o teste e ver passar**

Run: `npx vitest run src/lib/constantes.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 8: Criar o app mínimo para o build funcionar**

`src/app/globals.css`:

```css
@import 'tailwindcss';
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'O que assistir hoje',
  description: 'Filmes disponíveis nos serviços de streaming que você assina.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
```

`src/app/page.tsx`:

```tsx
export default function Home() {
  return <main>Em construção.</main>
}
```

- [ ] **Step 9: Verificar typecheck, lint e build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: os três passam. O `next build` gera `next-env.d.ts` — ele está no `.gitignore`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: esqueleto do projeto com Next, Tailwind, Vitest e ESLint"
```

---

### Task 2: Tipos de domínio e módulo de filtros

**Files:**
- Create: `src/lib/tipos.ts`, `src/lib/filtros/esquema.ts`, `src/lib/filtros/ler.ts`, `src/lib/filtros/escrever.ts`, `src/lib/filtros/query.ts`, `src/lib/filtros/index.ts`
- Test: `src/lib/filtros/filtros.test.ts`

**Interfaces:**
- Consumes: `@/lib/constantes` (`REGIAO`, `MAX_PAGINAS`, `MIN_VOTOS`).
- Produces:
  - Tipos `Genero`, `Filme`, `Elenco`, `FilmeDetalhado`, `Provedor`, `Disponibilidade`, `Ordenacao`, `Filtros`, `PaginaDeFilmes`, `ItemWatchlist`.
  - `lerFiltros(params: ParamsBrutos, servicosPadrao: number[]): Filtros`
  - `escreverFiltros(filtros: Filtros): URLSearchParams`
  - `paraQueryTmdb(filtros: Filtros, hoje?: Date): Record<string, string>`
  - `FILTROS_PADRAO: Filtros`
  - `type ParamsBrutos = Record<string, string | string[] | undefined>`

**Convenções de URL** (decisões deste plano, sem ambiguidade):

| Parâmetro | Significado |
|---|---|
| `servicos` ausente | usa os serviços do cookie |
| `servicos=todos` | sem filtro de serviço |
| `servicos=8,119` | ids de provedores |
| `generos=35,28` | ids de gêneros |
| `nota=7` | nota mínima |
| `duracao=120` | duração máxima em minutos |
| `de=1990` / `ate=1999` | período de lançamento |
| `ordem=popularidade\|nota\|lancamento` | ordenação (padrão `popularidade`) |
| `pagina=2` | página (1 a 500) |

`escreverFiltros` **sempre** emite `servicos` (ids ou `todos`), porque omitir faria o cookie reassumir o controle numa recarga. Os demais parâmetros são omitidos quando estão no padrão.

- [ ] **Step 1: Escrever os tipos de domínio**

`src/lib/tipos.ts`:

```ts
export type Genero = { id: number; nome: string }

export type Filme = {
  id: number
  titulo: string
  sinopse: string | null
  poster: string | null
  backdrop: string | null
  nota: number
  votos: number
  ano: number | null
}

export type Elenco = { id: number; nome: string; personagem: string; foto: string | null }

export type FilmeDetalhado = Filme & {
  duracaoMin: number | null
  generos: Genero[]
  elenco: Elenco[]
  trailerYoutubeId: string | null
}

export type Provedor = { id: number; nome: string; logo: string; prioridade: number }

export type Disponibilidade = {
  assinatura: Provedor[]
  aluguel: Provedor[]
  compra: Provedor[]
  gratis: Provedor[]
  linkJustWatch: string | null
}

export type Ordenacao = 'popularidade' | 'nota' | 'lancamento'

/** `servicos: []` significa "todos os serviços", ou seja, sem filtro de provedor. */
export type Filtros = {
  servicos: number[]
  generos: number[]
  notaMinima: number | null
  duracaoMaxMin: number | null
  anoDe: number | null
  anoAte: number | null
  ordenacao: Ordenacao
  pagina: number
}

export type PaginaDeFilmes = {
  filmes: Filme[]
  totalPaginas: number
  totalResultados: number
}

export type ItemWatchlist = { id: number; titulo: string; poster: string | null }
```

- [ ] **Step 2: Escrever os testes dos filtros**

`src/lib/filtros/filtros.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FILTROS_PADRAO, escreverFiltros, lerFiltros, paraQueryTmdb } from '@/lib/filtros'

describe('lerFiltros', () => {
  it('usa os serviços do cookie quando a URL não traz o parâmetro', () => {
    expect(lerFiltros({}, [8, 119]).servicos).toEqual([8, 119])
  })

  it('trata servicos=todos como ausência de filtro de provedor', () => {
    expect(lerFiltros({ servicos: 'todos' }, [8]).servicos).toEqual([])
  })

  it('lê listas de ids separadas por vírgula', () => {
    const f = lerFiltros({ servicos: '8,119', generos: '35,28' }, [])
    expect(f.servicos).toEqual([8, 119])
    expect(f.generos).toEqual([35, 28])
  })

  it('descarta ids inválidos em vez de quebrar', () => {
    expect(lerFiltros({ servicos: '8,abc,-3,0,119' }, []).servicos).toEqual([8, 119])
  })

  it('cai no padrão quando um valor escalar é inválido', () => {
    const f = lerFiltros({ nota: '99', duracao: 'x', ordem: 'aleatoria', pagina: '0' }, [])
    expect(f.notaMinima).toBeNull()
    expect(f.duracaoMaxMin).toBeNull()
    expect(f.ordenacao).toBe('popularidade')
    expect(f.pagina).toBe(1)
  })

  it('limita a página ao teto de 500 do TMDB', () => {
    expect(lerFiltros({ pagina: '700' }, []).pagina).toBe(1)
    expect(lerFiltros({ pagina: '500' }, []).pagina).toBe(500)
  })

  it('aceita o primeiro valor quando o parâmetro vem repetido', () => {
    expect(lerFiltros({ nota: ['7', '9'] }, []).notaMinima).toBe(7)
  })
})

describe('escreverFiltros', () => {
  it('sempre emite servicos para o cookie não reassumir o controle', () => {
    expect(escreverFiltros({ ...FILTROS_PADRAO }).get('servicos')).toBe('todos')
    expect(escreverFiltros({ ...FILTROS_PADRAO, servicos: [8, 119] }).get('servicos')).toBe('8,119')
  })

  it('omite os valores que estão no padrão', () => {
    const p = escreverFiltros({ ...FILTROS_PADRAO })
    expect(p.get('nota')).toBeNull()
    expect(p.get('ordem')).toBeNull()
    expect(p.get('pagina')).toBeNull()
  })

  it('faz a volta completa URL -> filtros -> URL', () => {
    const original = { ...FILTROS_PADRAO, servicos: [8], generos: [35], notaMinima: 7, pagina: 3 }
    expect(lerFiltros(Object.fromEntries(escreverFiltros(original)), [])).toEqual(original)
  })
})

describe('paraQueryTmdb', () => {
  it('exige watch_region e flatrate junto com o filtro de provedor', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, servicos: [8, 119] })
    expect(q.watch_region).toBe('BR')
    expect(q.with_watch_providers).toBe('8|119')
    expect(q.with_watch_monetization_types).toBe('flatrate')
  })

  it('não envia parâmetros de provedor quando nenhum serviço foi escolhido', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO })
    expect(q.watch_region).toBeUndefined()
    expect(q.with_watch_providers).toBeUndefined()
  })

  it('une gêneros com E lógico', () => {
    expect(paraQueryTmdb({ ...FILTROS_PADRAO, generos: [35, 28] }).with_genres).toBe('35,28')
  })

  it('aplica o piso de votos quando há nota mínima', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, notaMinima: 7 })
    expect(q['vote_average.gte']).toBe('7')
    expect(q['vote_count.gte']).toBe('100')
  })

  it('aplica o piso de votos também ao ordenar por nota', () => {
    expect(paraQueryTmdb({ ...FILTROS_PADRAO, ordenacao: 'nota' })['vote_count.gte']).toBe('100')
  })

  it('traduz duração e período', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, duracaoMaxMin: 120, anoDe: 1990, anoAte: 1999 })
    expect(q['with_runtime.lte']).toBe('120')
    expect(q['primary_release_date.gte']).toBe('1990-01-01')
    expect(q['primary_release_date.lte']).toBe('1999-12-31')
  })

  it('não deixa lançamentos futuros entrarem na ordenação por lançamento', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, ordenacao: 'lancamento' }, new Date('2026-08-13T00:00:00Z'))
    expect(q.sort_by).toBe('primary_release_date.desc')
    expect(q['primary_release_date.lte']).toBe('2026-08-13')
  })

  it('nunca pede página acima do teto', () => {
    expect(paraQueryTmdb({ ...FILTROS_PADRAO, pagina: 900 }).page).toBe('500')
  })
})
```

- [ ] **Step 3: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/filtros/filtros.test.ts`
Expected: FAIL — não consegue resolver `@/lib/filtros`.

- [ ] **Step 4: Implementar o módulo**

`src/lib/filtros/esquema.ts`:

```ts
import { z } from 'zod'
import { MAX_PAGINAS } from '@/lib/constantes'

export const esquemaNota = z.number().min(0).max(10)
export const esquemaDuracao = z.number().int().min(1).max(600)
export const esquemaAno = z.number().int().min(1874).max(2100)
export const esquemaPagina = z.number().int().min(1).max(MAX_PAGINAS)
export const esquemaOrdenacao = z.enum(['popularidade', 'nota', 'lancamento'])
```

`src/lib/filtros/ler.ts`:

```ts
import { z } from 'zod'
import type { Filtros } from '@/lib/tipos'
import {
  esquemaAno,
  esquemaDuracao,
  esquemaNota,
  esquemaOrdenacao,
  esquemaPagina,
} from './esquema'

export type ParamsBrutos = Record<string, string | string[] | undefined>

export const FILTROS_PADRAO: Filtros = {
  servicos: [],
  generos: [],
  notaMinima: null,
  duracaoMaxMin: null,
  anoDe: null,
  anoAte: null,
  ordenacao: 'popularidade',
  pagina: 1,
}

const primeiro = (valor: string | string[] | undefined): string | undefined =>
  Array.isArray(valor) ? valor[0] : valor

const lerIds = (valor: string | undefined): number[] =>
  (valor ?? '')
    .split(',')
    .map((parte) => Number(parte.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)

const lerNumero = (valor: string | undefined, esquema: z.ZodNumber): number | null => {
  if (valor === undefined || valor.trim() === '') return null
  const resultado = esquema.safeParse(Number(valor))
  return resultado.success ? resultado.data : null
}

export function lerFiltros(params: ParamsBrutos, servicosPadrao: number[]): Filtros {
  const bruto = (chave: string) => primeiro(params[chave])
  const servicos = bruto('servicos')

  return {
    servicos:
      servicos === undefined ? servicosPadrao : servicos === 'todos' ? [] : lerIds(servicos),
    generos: lerIds(bruto('generos')),
    notaMinima: lerNumero(bruto('nota'), esquemaNota),
    duracaoMaxMin: lerNumero(bruto('duracao'), esquemaDuracao),
    anoDe: lerNumero(bruto('de'), esquemaAno),
    anoAte: lerNumero(bruto('ate'), esquemaAno),
    ordenacao: esquemaOrdenacao.catch('popularidade').parse(bruto('ordem')),
    pagina: lerNumero(bruto('pagina'), esquemaPagina) ?? 1,
  }
}
```

`src/lib/filtros/escrever.ts`:

```ts
import type { Filtros } from '@/lib/tipos'
import { FILTROS_PADRAO } from './ler'

export function escreverFiltros(filtros: Filtros): URLSearchParams {
  const params = new URLSearchParams()

  params.set('servicos', filtros.servicos.length > 0 ? filtros.servicos.join(',') : 'todos')
  if (filtros.generos.length > 0) params.set('generos', filtros.generos.join(','))
  if (filtros.notaMinima !== null) params.set('nota', String(filtros.notaMinima))
  if (filtros.duracaoMaxMin !== null) params.set('duracao', String(filtros.duracaoMaxMin))
  if (filtros.anoDe !== null) params.set('de', String(filtros.anoDe))
  if (filtros.anoAte !== null) params.set('ate', String(filtros.anoAte))
  if (filtros.ordenacao !== FILTROS_PADRAO.ordenacao) params.set('ordem', filtros.ordenacao)
  if (filtros.pagina !== FILTROS_PADRAO.pagina) params.set('pagina', String(filtros.pagina))

  return params
}
```

`src/lib/filtros/query.ts`:

```ts
import { MAX_PAGINAS, MIN_VOTOS, REGIAO } from '@/lib/constantes'
import type { Filtros, Ordenacao } from '@/lib/tipos'

const ORDEM_TMDB: Record<Ordenacao, string> = {
  popularidade: 'popularity.desc',
  nota: 'vote_average.desc',
  lancamento: 'primary_release_date.desc',
}

export function paraQueryTmdb(filtros: Filtros, hoje: Date = new Date()): Record<string, string> {
  const query: Record<string, string> = {
    include_adult: 'false',
    page: String(Math.min(Math.max(filtros.pagina, 1), MAX_PAGINAS)),
    sort_by: ORDEM_TMDB[filtros.ordenacao],
  }

  if (filtros.servicos.length > 0) {
    query.watch_region = REGIAO
    query.with_watch_providers = filtros.servicos.join('|')
    query.with_watch_monetization_types = 'flatrate'
  }
  if (filtros.generos.length > 0) query.with_genres = filtros.generos.join(',')
  if (filtros.notaMinima !== null) query['vote_average.gte'] = String(filtros.notaMinima)
  if (filtros.notaMinima !== null || filtros.ordenacao === 'nota') {
    query['vote_count.gte'] = String(MIN_VOTOS)
  }
  if (filtros.duracaoMaxMin !== null) query['with_runtime.lte'] = String(filtros.duracaoMaxMin)
  if (filtros.anoDe !== null) query['primary_release_date.gte'] = `${filtros.anoDe}-01-01`
  if (filtros.anoAte !== null) query['primary_release_date.lte'] = `${filtros.anoAte}-12-31`

  // Sem isto, ordenar por lançamento traz filmes que ainda nem estrearam.
  if (filtros.ordenacao === 'lancamento') {
    const limite = hoje.toISOString().slice(0, 10)
    const atual = query['primary_release_date.lte']
    if (atual === undefined || atual > limite) query['primary_release_date.lte'] = limite
  }

  return query
}
```

`src/lib/filtros/index.ts`:

```ts
export { FILTROS_PADRAO, lerFiltros, type ParamsBrutos } from './ler'
export { escreverFiltros } from './escrever'
export { paraQueryTmdb } from './query'
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/filtros/filtros.test.ts && npm run typecheck`
Expected: PASS — 17 testes.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: tipos de domínio e tradução de filtros para query do TMDB"
```

---

### Task 3: Módulo de sorteio

**Files:**
- Create: `src/lib/sorteio/index.ts`
- Test: `src/lib/sorteio/sorteio.test.ts`

**Interfaces:**
- Consumes: `@/lib/constantes` (`MAX_PAGINAS`, `ITENS_POR_PAGINA`).
- Produces:
  - `type Alvo = { pagina: number; indice: number }`
  - `escolherAlvo(totalPaginas: number, itensUltimaPagina: number, rng: () => number): Alvo | null`
  - `itensNaUltimaPagina(totalResultados: number, totalPaginas: number): number`

O gerador aleatório entra por parâmetro para o teste ser determinístico. `escolherAlvo` consome `rng()` exatamente duas vezes: primeiro a página, depois o índice.

- [ ] **Step 1: Escrever os testes**

`src/lib/sorteio/sorteio.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { escolherAlvo, itensNaUltimaPagina } from '@/lib/sorteio'

/** Devolve os valores na ordem dada; útil para fixar o sorteio. */
const rngFixo = (...valores: number[]) => {
  let i = 0
  return () => valores[Math.min(i++, valores.length - 1)]
}

describe('itensNaUltimaPagina', () => {
  it('conta o resto da última página', () => {
    expect(itensNaUltimaPagina(45, 3)).toBe(5)
  })

  it('devolve a página cheia quando o resto é exato', () => {
    expect(itensNaUltimaPagina(40, 2)).toBe(20)
  })

  it('nunca passa do tamanho da página, mesmo além do teto de 500', () => {
    expect(itensNaUltimaPagina(100000, 500)).toBe(20)
  })

  it('devolve zero quando não há resultados', () => {
    expect(itensNaUltimaPagina(0, 0)).toBe(0)
  })
})

describe('escolherAlvo', () => {
  it('devolve null quando não há resultados', () => {
    expect(escolherAlvo(0, 0, rngFixo(0.5))).toBeNull()
  })

  it('sorteia página e índice a partir do gerador', () => {
    expect(escolherAlvo(10, 20, rngFixo(0.0, 0.0))).toEqual({ pagina: 1, indice: 0 })
    expect(escolherAlvo(10, 20, rngFixo(0.5, 0.5))).toEqual({ pagina: 6, indice: 10 })
  })

  it('respeita o teto de 500 páginas', () => {
    expect(escolherAlvo(38000, 20, rngFixo(0.9999, 0))!.pagina).toBe(500)
  })

  it('não sorteia índice inexistente na última página incompleta', () => {
    // 3 páginas, 5 itens na última: a página 3 só tem índices 0..4.
    const alvo = escolherAlvo(3, 5, rngFixo(0.9, 0.99))
    expect(alvo).toEqual({ pagina: 3, indice: 4 })
  })

  it('trata um único resultado', () => {
    expect(escolherAlvo(1, 1, rngFixo(0.99, 0.99))).toEqual({ pagina: 1, indice: 0 })
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/sorteio/sorteio.test.ts`
Expected: FAIL — não consegue resolver `@/lib/sorteio`.

- [ ] **Step 3: Implementar**

`src/lib/sorteio/index.ts`:

```ts
import { ITENS_POR_PAGINA, MAX_PAGINAS } from '@/lib/constantes'

export type Alvo = { pagina: number; indice: number }

export function itensNaUltimaPagina(totalResultados: number, totalPaginas: number): number {
  if (totalPaginas < 1) return 0
  const resto = totalResultados - (totalPaginas - 1) * ITENS_POR_PAGINA
  return Math.min(Math.max(resto, 0), ITENS_POR_PAGINA)
}

export function escolherAlvo(
  totalPaginas: number,
  itensUltimaPagina: number,
  rng: () => number,
): Alvo | null {
  if (totalPaginas < 1 || itensUltimaPagina < 1) return null

  const paginasUteis = Math.min(totalPaginas, MAX_PAGINAS)
  const pagina = Math.min(Math.floor(rng() * paginasUteis) + 1, paginasUteis)
  const itens = pagina === totalPaginas ? itensUltimaPagina : ITENS_POR_PAGINA
  const indice = Math.min(Math.floor(rng() * itens), itens - 1)

  return { pagina, indice }
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/sorteio/sorteio.test.ts`
Expected: PASS — 10 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sorteio
git commit -m "feat: sorteio entre todos os resultados dentro do teto da API"
```

---

### Task 4: Cliente HTTP do TMDB

**Files:**
- Create: `src/lib/tmdb/cliente.ts`
- Test: `src/lib/tmdb/cliente.test.ts`

**Interfaces:**
- Consumes: `@/lib/constantes` (`IDIOMA`, `BASE_TMDB_PADRAO`).
- Produces:
  - `class ErroTmdb extends Error { readonly status: number }`
  - `type OpcoesBusca = { revalidate: number; esperar?: (ms: number) => Promise<void> }`
  - `buscarTmdb<T>(caminho: string, params: Record<string, string>, opcoes: OpcoesBusca): Promise<T>`
  - `ESPERAS_MS: readonly [300, 900]`

O cliente lê `TMDB_READ_TOKEN` e, opcionalmente, `TMDB_BASE_URL` (usado pelos testes end-to-end para apontar para a API falsa). A função de espera entra por parâmetro para o teste do `429` não gastar 1,2 segundo de relógio.

- [ ] **Step 1: Escrever os testes**

`src/lib/tmdb/cliente.test.ts`:

```ts
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroTmdb, buscarTmdb } from '@/lib/tmdb/cliente'

const servidor = setupServer()

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  vi.stubEnv('TMDB_READ_TOKEN', 'token-de-teste')
  vi.stubEnv('TMDB_BASE_URL', 'https://api.themoviedb.org/3')
})

const semEspera = async () => {}

describe('buscarTmdb', () => {
  it('envia o token no header e o idioma na query', async () => {
    let recebido: Request | undefined
    servidor.use(
      http.get('https://api.themoviedb.org/3/discover/movie', ({ request }) => {
        recebido = request
        return HttpResponse.json({ ok: true })
      }),
    )

    const dados = await buscarTmdb<{ ok: boolean }>('/discover/movie', { page: '2' }, { revalidate: 900 })

    expect(dados).toEqual({ ok: true })
    expect(recebido?.headers.get('authorization')).toBe('Bearer token-de-teste')
    const url = new URL(recebido!.url)
    expect(url.searchParams.get('language')).toBe('pt-BR')
    expect(url.searchParams.get('page')).toBe('2')
  })

  it('tenta de novo depois de um 429 e devolve o resultado da nova tentativa', async () => {
    let chamadas = 0
    servidor.use(
      http.get('https://api.themoviedb.org/3/discover/movie', () => {
        chamadas += 1
        return chamadas === 1
          ? new HttpResponse(null, { status: 429 })
          : HttpResponse.json({ ok: true })
      }),
    )

    const dados = await buscarTmdb('/discover/movie', {}, { revalidate: 900, esperar: semEspera })

    expect(dados).toEqual({ ok: true })
    expect(chamadas).toBe(2)
  })

  it('desiste depois de três tentativas de 429', async () => {
    let chamadas = 0
    servidor.use(
      http.get('https://api.themoviedb.org/3/discover/movie', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 429 })
      }),
    )

    await expect(
      buscarTmdb('/discover/movie', {}, { revalidate: 900, esperar: semEspera }),
    ).rejects.toMatchObject({ name: 'ErroTmdb', status: 429 })
    expect(chamadas).toBe(3)
  })

  it('espera mais a cada nova tentativa', async () => {
    const esperas: number[] = []
    servidor.use(
      http.get('https://api.themoviedb.org/3/discover/movie', () => new HttpResponse(null, { status: 429 })),
    )

    await expect(
      buscarTmdb('/discover/movie', {}, {
        revalidate: 900,
        esperar: async (ms) => { esperas.push(ms) },
      }),
    ).rejects.toBeInstanceOf(ErroTmdb)
    expect(esperas).toEqual([300, 900])
  })

  it('não tenta de novo em erro que não seja 429', async () => {
    let chamadas = 0
    servidor.use(
      http.get('https://api.themoviedb.org/3/movie/1', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 404 })
      }),
    )

    await expect(buscarTmdb('/movie/1', {}, { revalidate: 900, esperar: semEspera })).rejects.toMatchObject({
      status: 404,
    })
    expect(chamadas).toBe(1)
  })

  it('falha com mensagem clara quando o token não está configurado', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', '')
    await expect(buscarTmdb('/discover/movie', {}, { revalidate: 900 })).rejects.toThrow(
      /TMDB_READ_TOKEN/,
    )
  })

  it('respeita TMDB_BASE_URL para apontar a uma API falsa', async () => {
    vi.stubEnv('TMDB_BASE_URL', 'http://127.0.0.1:4010')
    servidor.use(http.get('http://127.0.0.1:4010/genre/movie/list', () => HttpResponse.json({ genres: [] })))

    await expect(buscarTmdb('/genre/movie/list', {}, { revalidate: 86400 })).resolves.toEqual({
      genres: [],
    })
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/tmdb/cliente.test.ts`
Expected: FAIL — não consegue resolver `@/lib/tmdb/cliente`.

- [ ] **Step 3: Implementar o cliente**

`src/lib/tmdb/cliente.ts`:

```ts
import 'server-only'
import { BASE_TMDB_PADRAO, IDIOMA } from '@/lib/constantes'

export class ErroTmdb extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroTmdb'
  }
}

export const ESPERAS_MS = [300, 900] as const

export type OpcoesBusca = {
  revalidate: number
  esperar?: (ms: number) => Promise<void>
}

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

export async function buscarTmdb<T>(
  caminho: string,
  params: Record<string, string>,
  opcoes: OpcoesBusca,
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN
  if (!token) {
    throw new ErroTmdb(500, 'TMDB_READ_TOKEN não configurado. Veja o .env.example.')
  }

  const url = new URL(`${process.env.TMDB_BASE_URL || BASE_TMDB_PADRAO}${caminho}`)
  url.searchParams.set('language', IDIOMA)
  for (const [chave, valor] of Object.entries(params)) url.searchParams.set(chave, valor)

  const esperar = opcoes.esperar ?? dormir

  for (let tentativa = 0; ; tentativa += 1) {
    const resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      next: { revalidate: opcoes.revalidate },
    })

    if (resposta.ok) return (await resposta.json()) as T

    if (resposta.status === 429 && tentativa < ESPERAS_MS.length) {
      await esperar(ESPERAS_MS[tentativa])
      continue
    }

    throw new ErroTmdb(resposta.status, `TMDB respondeu ${resposta.status} em ${caminho}`)
  }
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/tmdb/cliente.test.ts && npm run typecheck`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tmdb
git commit -m "feat: cliente do TMDB com token no servidor e nova tentativa em 429"
```

---

### Task 5: Mapeadores e funções de domínio do TMDB

**Files:**
- Create: `src/lib/tmdb/tipos-crus.ts`, `src/lib/tmdb/mapeadores.ts`, `src/lib/tmdb/index.ts`
- Test: `src/lib/tmdb/dominio.test.ts`

**Interfaces:**
- Consumes: `buscarTmdb`, `ErroTmdb`, `paraQueryTmdb`, tipos de domínio, `REVALIDATE`, `REGIAO`, `MAX_PAGINAS`.
- Produces:
  - `descobrirFilmes(filtros: Filtros): Promise<PaginaDeFilmes>`
  - `obterFilme(id: number): Promise<FilmeDetalhado>`
  - `obterDisponibilidade(id: number): Promise<Disponibilidade>`
  - `listarProvedores(): Promise<Provedor[]>`
  - `listarGeneros(): Promise<Genero[]>`
  - `buscarPorTitulo(termo: string, pagina: number): Promise<PaginaDeFilmes>`
  - `urlImagem(caminho: string | null | undefined, tamanho: string): string | null`
  - `mapearFilme`, `mapearProvedor`

Regras que os testes travam: `totalPaginas` já sai limitado a 500; a sinopse cai para o inglês quando o TMDB não tem tradução em `pt-BR` (só em `obterFilme` — na grade não há sinopse e uma segunda chamada por card seria desperdício); `gratis` junta `free` e `ads`; provedores saem ordenados por `display_priority`.

- [ ] **Step 1: Escrever os testes**

`src/lib/tmdb/dominio.test.ts`:

```ts
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FILTROS_PADRAO } from '@/lib/filtros'
import {
  buscarPorTitulo,
  descobrirFilmes,
  listarGeneros,
  listarProvedores,
  obterDisponibilidade,
  obterFilme,
  urlImagem,
} from '@/lib/tmdb'

const BASE = 'https://api.themoviedb.org/3'
const servidor = setupServer()

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())
beforeEach(() => {
  vi.stubEnv('TMDB_READ_TOKEN', 'token-de-teste')
  vi.stubEnv('TMDB_BASE_URL', BASE)
})

const filmeCru = {
  id: 27205,
  title: 'A Origem',
  original_title: 'Inception',
  overview: 'Um ladrão que invade sonhos.',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  vote_average: 8.4,
  vote_count: 35000,
  release_date: '2010-07-15',
}

describe('urlImagem', () => {
  it('monta a URL completa', () => {
    expect(urlImagem('/poster.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/poster.jpg')
  })

  it('devolve null quando não há imagem', () => {
    expect(urlImagem(null, 'w342')).toBeNull()
  })
})

describe('descobrirFilmes', () => {
  it('mapeia a resposta para o domínio', async () => {
    servidor.use(
      http.get(`${BASE}/discover/movie`, () =>
        HttpResponse.json({ page: 1, results: [filmeCru], total_pages: 3, total_results: 45 }),
      ),
    )

    const pagina = await descobrirFilmes(FILTROS_PADRAO)

    expect(pagina.totalResultados).toBe(45)
    expect(pagina.filmes[0]).toEqual({
      id: 27205,
      titulo: 'A Origem',
      sinopse: 'Um ladrão que invade sonhos.',
      poster: 'https://image.tmdb.org/t/p/w342/poster.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
      nota: 8.4,
      votos: 35000,
      ano: 2010,
    })
  })

  it('limita o total de páginas ao teto de 500', async () => {
    servidor.use(
      http.get(`${BASE}/discover/movie`, () =>
        HttpResponse.json({ page: 1, results: [], total_pages: 38000, total_results: 760000 }),
      ),
    )

    expect((await descobrirFilmes(FILTROS_PADRAO)).totalPaginas).toBe(500)
  })

  it('repassa os filtros traduzidos para a API', async () => {
    let url: URL | undefined
    servidor.use(
      http.get(`${BASE}/discover/movie`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 })
      }),
    )

    await descobrirFilmes({ ...FILTROS_PADRAO, servicos: [8, 119], notaMinima: 7 })

    expect(url?.searchParams.get('with_watch_providers')).toBe('8|119')
    expect(url?.searchParams.get('with_watch_monetization_types')).toBe('flatrate')
    expect(url?.searchParams.get('watch_region')).toBe('BR')
    expect(url?.searchParams.get('vote_count.gte')).toBe('100')
  })

  it('trata título e imagens ausentes sem quebrar', async () => {
    servidor.use(
      http.get(`${BASE}/discover/movie`, () =>
        HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            { ...filmeCru, title: '', poster_path: null, backdrop_path: null, release_date: '' },
          ],
        }),
      ),
    )

    const filme = (await descobrirFilmes(FILTROS_PADRAO)).filmes[0]
    expect(filme.titulo).toBe('Inception')
    expect(filme.poster).toBeNull()
    expect(filme.ano).toBeNull()
  })
})

describe('obterFilme', () => {
  it('devolve duração, gêneros, elenco e trailer do YouTube', async () => {
    servidor.use(
      http.get(`${BASE}/movie/27205`, () =>
        HttpResponse.json({
          ...filmeCru,
          runtime: 148,
          genres: [{ id: 28, name: 'Ação' }],
          credits: {
            cast: Array.from({ length: 12 }, (_, i) => ({
              id: i,
              name: `Ator ${i}`,
              character: `Personagem ${i}`,
              profile_path: '/ator.jpg',
            })),
          },
          videos: {
            results: [
              { key: 'errado', site: 'Vimeo', type: 'Trailer' },
              { key: 'abc123', site: 'YouTube', type: 'Trailer' },
            ],
          },
        }),
      ),
    )

    const filme = await obterFilme(27205)

    expect(filme.duracaoMin).toBe(148)
    expect(filme.generos).toEqual([{ id: 28, nome: 'Ação' }])
    expect(filme.elenco).toHaveLength(8)
    expect(filme.elenco[0]).toEqual({
      id: 0,
      nome: 'Ator 0',
      personagem: 'Personagem 0',
      foto: 'https://image.tmdb.org/t/p/w185/ator.jpg',
    })
    expect(filme.trailerYoutubeId).toBe('abc123')
  })

  it('cai para a sinopse em inglês quando não há tradução em pt-BR', async () => {
    const idiomas: string[] = []
    servidor.use(
      http.get(`${BASE}/movie/27205`, ({ request }) => {
        const idioma = new URL(request.url).searchParams.get('language') ?? ''
        idiomas.push(idioma)
        return HttpResponse.json({
          ...filmeCru,
          overview: idioma === 'pt-BR' ? '' : 'A thief who steals secrets from dreams.',
          runtime: 148,
          genres: [],
          credits: { cast: [] },
          videos: { results: [] },
        })
      }),
    )

    const filme = await obterFilme(27205)

    expect(filme.sinopse).toBe('A thief who steals secrets from dreams.')
    expect(idiomas).toEqual(['pt-BR', 'en-US'])
  })

  it('deixa a sinopse nula quando não existe em nenhum idioma', async () => {
    servidor.use(
      http.get(`${BASE}/movie/27205`, () =>
        HttpResponse.json({
          ...filmeCru,
          overview: '',
          runtime: null,
          genres: [],
          credits: { cast: [] },
          videos: { results: [] },
        }),
      ),
    )

    expect((await obterFilme(27205)).sinopse).toBeNull()
  })
})

describe('obterDisponibilidade', () => {
  it('separa assinatura, aluguel, compra e grátis, e junta free com ads', async () => {
    servidor.use(
      http.get(`${BASE}/movie/27205/watch/providers`, () =>
        HttpResponse.json({
          results: {
            BR: {
              link: 'https://www.themoviedb.org/movie/27205/watch?locale=BR',
              flatrate: [
                { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/a.jpg', display_priority: 2 },
                { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 },
              ],
              rent: [{ provider_id: 3, provider_name: 'Google Play', logo_path: '/g.jpg', display_priority: 5 }],
              free: [{ provider_id: 613, provider_name: 'Pluto TV', logo_path: '/p.jpg', display_priority: 9 }],
              ads: [{ provider_id: 583, provider_name: 'Vix', logo_path: '/v.jpg', display_priority: 8 }],
            },
          },
        }),
      ),
    )

    const disponibilidade = await obterDisponibilidade(27205)

    expect(disponibilidade.assinatura.map((p) => p.nome)).toEqual(['Netflix', 'Amazon Prime Video'])
    expect(disponibilidade.aluguel).toHaveLength(1)
    expect(disponibilidade.compra).toEqual([])
    expect(disponibilidade.gratis.map((p) => p.nome)).toEqual(['Vix', 'Pluto TV'])
    expect(disponibilidade.linkJustWatch).toContain('locale=BR')
  })

  it('devolve tudo vazio quando o filme não está no Brasil', async () => {
    servidor.use(
      http.get(`${BASE}/movie/27205/watch/providers`, () => HttpResponse.json({ results: { US: {} } })),
    )

    const disponibilidade = await obterDisponibilidade(27205)

    expect(disponibilidade.assinatura).toEqual([])
    expect(disponibilidade.linkJustWatch).toBeNull()
  })
})

describe('listas e busca', () => {
  it('lista provedores do Brasil ordenados por prioridade', async () => {
    let url: URL | undefined
    servidor.use(
      http.get(`${BASE}/watch/providers/movie`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          results: [
            { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/a.jpg', display_priority: 2 },
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 },
          ],
        })
      }),
    )

    const provedores = await listarProvedores()

    expect(url?.searchParams.get('watch_region')).toBe('BR')
    expect(provedores.map((p) => p.id)).toEqual([8, 119])
    expect(provedores[0].logo).toBe('https://image.tmdb.org/t/p/w92/n.jpg')
  })

  it('lista gêneros', async () => {
    servidor.use(
      http.get(`${BASE}/genre/movie/list`, () =>
        HttpResponse.json({ genres: [{ id: 35, name: 'Comédia' }] }),
      ),
    )

    expect(await listarGeneros()).toEqual([{ id: 35, nome: 'Comédia' }])
  })

  it('busca por título sem filtrar por serviço', async () => {
    let url: URL | undefined
    servidor.use(
      http.get(`${BASE}/search/movie`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ page: 1, results: [filmeCru], total_pages: 1, total_results: 1 })
      }),
    )

    const pagina = await buscarPorTitulo('origem', 1)

    expect(url?.searchParams.get('query')).toBe('origem')
    expect(url?.searchParams.get('with_watch_providers')).toBeNull()
    expect(pagina.filmes[0].titulo).toBe('A Origem')
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/tmdb/dominio.test.ts`
Expected: FAIL — não consegue resolver `@/lib/tmdb`.

- [ ] **Step 3: Escrever os tipos crus**

`src/lib/tmdb/tipos-crus.ts`:

```ts
export type FilmeCru = {
  id: number
  title?: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  release_date?: string
}

export type ListaCrua = {
  results: FilmeCru[]
  total_pages: number
  total_results: number
}

export type FilmeDetalhadoCru = FilmeCru & {
  runtime?: number | null
  genres?: { id: number; name: string }[]
  credits?: { cast?: { id: number; name: string; character?: string; profile_path?: string | null }[] }
  videos?: { results?: { key: string; site: string; type: string }[] }
}

export type ProvedorCru = {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
}

export type ProvedoresCrus = {
  results?: Record<
    string,
    {
      link?: string
      flatrate?: ProvedorCru[]
      rent?: ProvedorCru[]
      buy?: ProvedorCru[]
      free?: ProvedorCru[]
      ads?: ProvedorCru[]
    }
  >
}

export type GenerosCrus = { genres: { id: number; name: string }[] }
export type ListaProvedoresCrua = { results: ProvedorCru[] }
```

- [ ] **Step 4: Escrever os mapeadores**

`src/lib/tmdb/mapeadores.ts`:

```ts
import type { Elenco, Filme, Genero, Provedor } from '@/lib/tipos'
import type { FilmeCru, FilmeDetalhadoCru, ProvedorCru } from './tipos-crus'

export function urlImagem(caminho: string | null | undefined, tamanho: string): string | null {
  return caminho ? `https://image.tmdb.org/t/p/${tamanho}${caminho}` : null
}

const textoOuNulo = (valor: string | undefined): string | null => {
  const limpo = valor?.trim() ?? ''
  return limpo === '' ? null : limpo
}

export function mapearFilme(cru: FilmeCru): Filme {
  return {
    id: cru.id,
    titulo: textoOuNulo(cru.title) ?? textoOuNulo(cru.original_title) ?? 'Sem título',
    sinopse: textoOuNulo(cru.overview),
    poster: urlImagem(cru.poster_path, 'w342'),
    backdrop: urlImagem(cru.backdrop_path, 'w780'),
    nota: cru.vote_average ?? 0,
    votos: cru.vote_count ?? 0,
    ano: cru.release_date ? Number(cru.release_date.slice(0, 4)) : null,
  }
}

export function mapearGenero(cru: { id: number; name: string }): Genero {
  return { id: cru.id, nome: cru.name }
}

export function mapearProvedor(cru: ProvedorCru): Provedor {
  return {
    id: cru.provider_id,
    nome: cru.provider_name,
    logo: urlImagem(cru.logo_path, 'w92') ?? '',
    prioridade: cru.display_priority,
  }
}

export const ordenarProvedores = (provedores: Provedor[]): Provedor[] =>
  [...provedores].sort((a, b) => a.prioridade - b.prioridade)

export function mapearElenco(cru: FilmeDetalhadoCru): Elenco[] {
  return (cru.credits?.cast ?? []).slice(0, 8).map((ator) => ({
    id: ator.id,
    nome: ator.name,
    personagem: ator.character ?? '',
    foto: urlImagem(ator.profile_path, 'w185'),
  }))
}

export function acharTrailer(cru: FilmeDetalhadoCru): string | null {
  const video = (cru.videos?.results ?? []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
  return video?.key ?? null
}
```

- [ ] **Step 5: Escrever as funções de domínio**

`src/lib/tmdb/index.ts`:

```ts
import 'server-only'
import { MAX_PAGINAS, REGIAO, REVALIDATE } from '@/lib/constantes'
import { paraQueryTmdb } from '@/lib/filtros'
import type {
  Disponibilidade,
  FilmeDetalhado,
  Filtros,
  Genero,
  PaginaDeFilmes,
  Provedor,
} from '@/lib/tipos'
import { buscarTmdb } from './cliente'
import {
  acharTrailer,
  mapearElenco,
  mapearFilme,
  mapearGenero,
  mapearProvedor,
  ordenarProvedores,
  urlImagem,
} from './mapeadores'
import type {
  FilmeDetalhadoCru,
  GenerosCrus,
  ListaCrua,
  ListaProvedoresCrua,
  ProvedoresCrus,
} from './tipos-crus'

export { ErroTmdb } from './cliente'
export { urlImagem, mapearFilme, mapearProvedor } from './mapeadores'

const paraPagina = (lista: ListaCrua): PaginaDeFilmes => ({
  filmes: lista.results.map(mapearFilme),
  totalPaginas: Math.min(lista.total_pages, MAX_PAGINAS),
  totalResultados: lista.total_results,
})

export async function descobrirFilmes(filtros: Filtros): Promise<PaginaDeFilmes> {
  const lista = await buscarTmdb<ListaCrua>('/discover/movie', paraQueryTmdb(filtros), {
    revalidate: REVALIDATE.descoberta,
  })
  return paraPagina(lista)
}

export async function buscarPorTitulo(termo: string, pagina: number): Promise<PaginaDeFilmes> {
  const lista = await buscarTmdb<ListaCrua>(
    '/search/movie',
    { query: termo, include_adult: 'false', page: String(Math.min(Math.max(pagina, 1), MAX_PAGINAS)) },
    { revalidate: REVALIDATE.busca },
  )
  return paraPagina(lista)
}

export async function obterFilme(id: number): Promise<FilmeDetalhado> {
  const cru = await buscarTmdb<FilmeDetalhadoCru>(
    `/movie/${id}`,
    { append_to_response: 'credits,videos', include_video_language: 'pt,en' },
    { revalidate: REVALIDATE.filme },
  )

  const base = mapearFilme(cru)

  // O TMDB devolve overview vazio quando não há tradução; buscamos o original.
  let sinopse = base.sinopse
  if (sinopse === null) {
    const emIngles = await buscarTmdb<FilmeDetalhadoCru>(
      `/movie/${id}`,
      { language: 'en-US' },
      { revalidate: REVALIDATE.filme },
    )
    sinopse = mapearFilme(emIngles).sinopse
  }

  return {
    ...base,
    sinopse,
    duracaoMin: cru.runtime ?? null,
    generos: (cru.genres ?? []).map(mapearGenero),
    elenco: mapearElenco(cru),
    trailerYoutubeId: acharTrailer(cru),
  }
}

export async function obterDisponibilidade(id: number): Promise<Disponibilidade> {
  const cru = await buscarTmdb<ProvedoresCrus>(`/movie/${id}/watch/providers`, {}, {
    revalidate: REVALIDATE.disponibilidade,
  })
  const regiao = cru.results?.[REGIAO]

  return {
    assinatura: ordenarProvedores((regiao?.flatrate ?? []).map(mapearProvedor)),
    aluguel: ordenarProvedores((regiao?.rent ?? []).map(mapearProvedor)),
    compra: ordenarProvedores((regiao?.buy ?? []).map(mapearProvedor)),
    gratis: ordenarProvedores([...(regiao?.free ?? []), ...(regiao?.ads ?? [])].map(mapearProvedor)),
    linkJustWatch: regiao?.link ?? null,
  }
}

export async function listarProvedores(): Promise<Provedor[]> {
  const cru = await buscarTmdb<ListaProvedoresCrua>(
    '/watch/providers/movie',
    { watch_region: REGIAO },
    { revalidate: REVALIDATE.listas },
  )
  return ordenarProvedores(cru.results.map(mapearProvedor))
}

export async function listarGeneros(): Promise<Genero[]> {
  const cru = await buscarTmdb<GenerosCrus>('/genre/movie/list', {}, { revalidate: REVALIDATE.listas })
  return cru.genres.map(mapearGenero)
}
```

Atenção ao `buscarTmdb` de `obterFilme` em inglês: `language` é definido pelo cliente antes de aplicar `params`, então passar `language: 'en-US'` nos params sobrescreve o padrão. É por isso que o teste verifica a ordem `['pt-BR', 'en-US']`.

- [ ] **Step 6: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/tmdb && npm run typecheck`
Expected: PASS — 14 testes de domínio + os 7 do cliente.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tmdb
git commit -m "feat: funções de domínio do TMDB com mapeamento e queda de idioma"
```

---

### Task 6: Preferências — cookie de serviços e watchlist

**Files:**
- Create: `src/lib/preferencias/servicos.ts`, `src/lib/preferencias/servicos-servidor.ts`, `src/lib/preferencias/servicos-cliente.ts`, `src/lib/preferencias/watchlist.ts`, `src/lib/preferencias/index.ts`
- Test: `src/lib/preferencias/preferencias.test.ts`

**Interfaces:**
- Consumes: `ItemWatchlist` de `@/lib/tipos`.
- Produces:
  - `COOKIE_SERVICOS = 'servicos'`, `CHAVE_WATCHLIST = 'watchlist'`
  - `decodificarServicos(valor: string | undefined): number[]`
  - `codificarServicos(ids: number[]): string`
  - `lerServicosDoCookie(): Promise<number[]>` (servidor)
  - `salvarServicos(ids: number[]): void` (cliente, escreve `document.cookie`)
  - `lerWatchlist(): ItemWatchlist[]`
  - `alternarWatchlist(item: ItemWatchlist): ItemWatchlist[]`
  - `estaNaWatchlist(id: number): boolean`

A separação em três arquivos não é cerimônia: `next/headers` só existe no servidor e `document` só existe no cliente. O núcleo puro fica em `servicos.ts`, que os dois lados importam.

- [ ] **Step 1: Escrever os testes**

`src/lib/preferencias/preferencias.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CHAVE_WATCHLIST,
  alternarWatchlist,
  codificarServicos,
  decodificarServicos,
  estaNaWatchlist,
  lerWatchlist,
} from '@/lib/preferencias'

describe('cookie de serviços', () => {
  it('codifica ids como lista separada por vírgula', () => {
    expect(codificarServicos([8, 119])).toBe('8,119')
  })

  it('decodifica ignorando lixo', () => {
    expect(decodificarServicos('8,abc,,119')).toEqual([8, 119])
  })

  it('devolve lista vazia quando o cookie não existe', () => {
    expect(decodificarServicos(undefined)).toEqual([])
  })
})

describe('watchlist', () => {
  const filme = { id: 27205, titulo: 'A Origem', poster: null }

  beforeEach(() => localStorage.clear())

  it('começa vazia', () => {
    expect(lerWatchlist()).toEqual([])
  })

  it('adiciona e remove alternando o mesmo filme', () => {
    expect(alternarWatchlist(filme)).toEqual([filme])
    expect(lerWatchlist()).toEqual([filme])
    expect(estaNaWatchlist(27205)).toBe(true)

    expect(alternarWatchlist(filme)).toEqual([])
    expect(estaNaWatchlist(27205)).toBe(false)
  })

  it('guarda só id, título e pôster', () => {
    alternarWatchlist({ ...filme, extra: 'ignorado' } as never)
    expect(Object.keys(lerWatchlist()[0]).sort()).toEqual(['id', 'poster', 'titulo'])
  })

  it('sobrevive a conteúdo corrompido no localStorage', () => {
    localStorage.setItem(CHAVE_WATCHLIST, '{isso não é json}')
    expect(lerWatchlist()).toEqual([])
  })

  it('descarta um valor que não seja lista', () => {
    localStorage.setItem(CHAVE_WATCHLIST, '{"id":1}')
    expect(lerWatchlist()).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/preferencias`
Expected: FAIL — não consegue resolver `@/lib/preferencias`.

- [ ] **Step 3: Implementar**

`src/lib/preferencias/servicos.ts`:

```ts
export const COOKIE_SERVICOS = 'servicos'
export const DIAS_DO_COOKIE = 365

export function decodificarServicos(valor: string | undefined): number[] {
  return (valor ?? '')
    .split(',')
    .map((parte) => Number(parte.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

export const codificarServicos = (ids: number[]): string => ids.join(',')
```

`src/lib/preferencias/servicos-servidor.ts`:

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { COOKIE_SERVICOS, decodificarServicos } from './servicos'

/** Lista vazia significa "ainda não escolheu" ou "todos". Quem precisa distinguir usa escolheuServicos. */
export async function lerServicosDoCookie(): Promise<number[]> {
  const cookieStore = await cookies()
  return decodificarServicos(cookieStore.get(COOKIE_SERVICOS)?.value)
}

export async function escolheuServicos(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_SERVICOS) !== undefined
}
```

`src/lib/preferencias/servicos-cliente.ts`:

```ts
'use client'
import { COOKIE_SERVICOS, DIAS_DO_COOKIE, codificarServicos } from './servicos'

export function salvarServicos(ids: number[]): void {
  const maxAge = DIAS_DO_COOKIE * 24 * 60 * 60
  document.cookie = `${COOKIE_SERVICOS}=${codificarServicos(ids)}; path=/; max-age=${maxAge}; SameSite=Lax`
}
```

`src/lib/preferencias/watchlist.ts`:

```ts
import type { ItemWatchlist } from '@/lib/tipos'

export const CHAVE_WATCHLIST = 'watchlist'

const ehItem = (valor: unknown): valor is ItemWatchlist =>
  typeof valor === 'object' && valor !== null && typeof (valor as ItemWatchlist).id === 'number'

export function lerWatchlist(): ItemWatchlist[] {
  if (typeof window === 'undefined') return []
  try {
    const cru: unknown = JSON.parse(localStorage.getItem(CHAVE_WATCHLIST) ?? '[]')
    return Array.isArray(cru) ? cru.filter(ehItem) : []
  } catch {
    return []
  }
}

function salvar(itens: ItemWatchlist[]): ItemWatchlist[] {
  localStorage.setItem(CHAVE_WATCHLIST, JSON.stringify(itens))
  return itens
}

export function alternarWatchlist(item: ItemWatchlist): ItemWatchlist[] {
  const atual = lerWatchlist()
  if (atual.some((i) => i.id === item.id)) {
    return salvar(atual.filter((i) => i.id !== item.id))
  }
  return salvar([...atual, { id: item.id, titulo: item.titulo, poster: item.poster }])
}

export const estaNaWatchlist = (id: number): boolean => lerWatchlist().some((i) => i.id === id)
```

`src/lib/preferencias/index.ts` — reexporta só o que não depende de servidor ou cliente exclusivamente:

```ts
export { COOKIE_SERVICOS, codificarServicos, decodificarServicos } from './servicos'
export { CHAVE_WATCHLIST, alternarWatchlist, estaNaWatchlist, lerWatchlist } from './watchlist'
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/preferencias && npm run typecheck`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preferencias
git commit -m "feat: cookie de serviços assinados e watchlist no localStorage"
```

---

### Task 7: Layout, rodapé de atribuição e home com a grade

> Use a skill `frontend-design` antes de escrever o JSX desta tarefa e das seguintes. O código abaixo define estrutura, acessibilidade e testes; a estética é decisão da skill de design.

**Files:**
- Create: `src/components/layout/Cabecalho.tsx`, `src/components/layout/Rodape.tsx`, `src/components/filme/CardFilme.tsx`, `src/components/filme/GradeFilmes.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/components/layout/Rodape.test.tsx`, `src/components/filme/CardFilme.test.tsx`

**Interfaces:**
- Consumes: `descobrirFilmes`, `lerFiltros`, `lerServicosDoCookie`, tipos `Filme`, `PaginaDeFilmes`.
- Produces:
  - `<CardFilme filme={filme} />` — link para `/filme/[id]`
  - `<GradeFilmes filmes={filmes} />` — lista semântica (`<ul>`)
  - `<Rodape />`, `<Cabecalho />`
  - Home aceita `searchParams` (Promise, conforme Next 15).

- [ ] **Step 1: Escrever os testes**

`src/components/layout/Rodape.test.tsx` — o rodapé é obrigação contratual com o TMDB, não decoração; por isso tem teste.

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Rodape } from '@/components/layout/Rodape'

describe('Rodape', () => {
  it('credita o JustWatch como fonte dos dados de streaming', () => {
    render(<Rodape />)
    expect(screen.getByText(/fornecidos por JustWatch/i)).toBeInTheDocument()
  })

  it('mostra o aviso exigido pelos termos do TMDB', () => {
    render(<Rodape />)
    expect(
      screen.getByText(/não é endossado, certificado ou aprovado pelo TMDB/i),
    ).toBeInTheDocument()
  })

  it('mostra o logo do TMDB com texto alternativo', () => {
    render(<Rodape />)
    expect(screen.getByAltText('TMDB')).toBeInTheDocument()
  })
})
```

`src/components/filme/CardFilme.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardFilme } from '@/components/filme/CardFilme'
import type { Filme } from '@/lib/tipos'

const filme: Filme = {
  id: 27205,
  titulo: 'A Origem',
  sinopse: 'Um ladrão que invade sonhos.',
  poster: 'https://image.tmdb.org/t/p/w342/poster.jpg',
  backdrop: null,
  nota: 8.37,
  votos: 35000,
  ano: 2010,
}

describe('CardFilme', () => {
  it('leva para a página de detalhe', () => {
    render(<CardFilme filme={filme} />)
    expect(screen.getByRole('link', { name: /A Origem/ })).toHaveAttribute('href', '/filme/27205')
  })

  it('mostra ano e nota com uma casa decimal', () => {
    render(<CardFilme filme={filme} />)
    expect(screen.getByText('2010')).toBeInTheDocument()
    expect(screen.getByText('8.4')).toBeInTheDocument()
  })

  it('usa o título como texto alternativo do pôster', () => {
    render(<CardFilme filme={filme} />)
    expect(screen.getByAltText('A Origem')).toBeInTheDocument()
  })

  it('mostra um espaço reservado quando não há pôster', () => {
    render(<CardFilme filme={{ ...filme, poster: null }} />)
    expect(screen.queryByAltText('A Origem')).not.toBeInTheDocument()
    expect(screen.getByText('Sem pôster')).toBeInTheDocument()
  })

  it('omite o ano quando não se sabe a data de lançamento', () => {
    render(<CardFilme filme={{ ...filme, ano: null }} />)
    expect(screen.queryByText('2010')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/components`
Expected: FAIL — os componentes não existem.

- [ ] **Step 3: Implementar os componentes**

`src/components/layout/Rodape.tsx`:

```tsx
export function Rodape() {
  return (
    <footer>
      <p>Dados de disponibilidade em streaming fornecidos por JustWatch.</p>
      <p>
        Este produto usa a API do TMDB, mas não é endossado, certificado ou aprovado pelo TMDB.
      </p>
      {/* O logo precisa aparecer com menos destaque que a identidade do app. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tmdb.svg" alt="TMDB" width={80} height={32} />
    </footer>
  )
}
```

Aqui usamos `<img>` e não `next/image` de propósito — é um asset local, estático e minúsculo, e otimizá-lo não traz nada. Daí o `eslint-disable-next-line`.

`src/components/layout/Cabecalho.tsx`:

```tsx
import Link from 'next/link'

export function Cabecalho() {
  return (
    <header>
      <Link href="/">O que assistir hoje</Link>
      <nav>
        <Link href="/minha-lista">Minha lista</Link>
      </nav>
    </header>
  )
}
```

`src/components/filme/CardFilme.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Filme } from '@/lib/tipos'

export function CardFilme({ filme }: { filme: Filme }) {
  return (
    <Link href={`/filme/${filme.id}`}>
      {filme.poster ? (
        <Image src={filme.poster} alt={filme.titulo} width={342} height={513} />
      ) : (
        <div role="presentation">Sem pôster</div>
      )}
      <h3>{filme.titulo}</h3>
      {filme.ano !== null && <span>{filme.ano}</span>}
      <span>{filme.nota.toFixed(1)}</span>
    </Link>
  )
}
```

`src/components/filme/GradeFilmes.tsx`:

```tsx
import { CardFilme } from './CardFilme'
import type { Filme } from '@/lib/tipos'

export function GradeFilmes({ filmes }: { filmes: Filme[] }) {
  return (
    <ul>
      {filmes.map((filme) => (
        <li key={filme.id}>
          <CardFilme filme={filme} />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Ligar o layout e a home**

`src/app/layout.tsx` — acrescente cabeçalho e rodapé ao `<body>`:

```tsx
import type { Metadata } from 'next'
import { Cabecalho } from '@/components/layout/Cabecalho'
import { Rodape } from '@/components/layout/Rodape'
import './globals.css'

export const metadata: Metadata = {
  title: 'O que assistir hoje',
  description: 'Filmes disponíveis nos serviços de streaming que você assina.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Cabecalho />
        {children}
        <Rodape />
      </body>
    </html>
  )
}
```

`src/app/page.tsx`:

```tsx
import { GradeFilmes } from '@/components/filme/GradeFilmes'
import { lerFiltros, type ParamsBrutos } from '@/lib/filtros'
import { lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { descobrirFilmes } from '@/lib/tmdb'

export default async function Home({ searchParams }: { searchParams: Promise<ParamsBrutos> }) {
  const filtros = lerFiltros(await searchParams, await lerServicosDoCookie())
  const pagina = await descobrirFilmes(filtros)

  return (
    <main>
      <h1>O que assistir hoje</h1>
      <p>{pagina.totalResultados} filmes encontrados</p>
      <GradeFilmes filmes={pagina.filmes} />
    </main>
  )
}
```

`src/app/error.tsx` — precisa ser Client Component:

```tsx
'use client'

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <h1>Não consegui carregar os filmes</h1>
      <p>Pode ter sido uma instabilidade do TMDB. Tente de novo em alguns segundos.</p>
      <button type="button" onClick={reset}>
        Tentar de novo
      </button>
    </main>
  )
}
```

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <main>
      <h1>Não encontrei essa página</h1>
      <Link href="/">Voltar para a home</Link>
    </main>
  )
}
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run src/components && npm run typecheck && npm run lint`
Expected: PASS — 8 testes.

- [ ] **Step 6: Conferir no navegador**

Run: `npm run dev` com `TMDB_READ_TOKEN` preenchido em `.env.local`
Expected: a home lista filmes populares com pôster, e o rodapé traz as duas atribuições.

- [ ] **Step 7: Commit**

```bash
git add src app
git commit -m "feat: layout com atribuição obrigatória e grade de filmes na home"
```

---

### Task 8: Barra de filtros que reescreve a URL

**Files:**
- Create: `src/components/filtros/BarraFiltros.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/filtros/BarraFiltros.test.tsx`

**Interfaces:**
- Consumes: `escreverFiltros`, tipos `Filtros`, `Genero`, `Provedor`.
- Produces: `<BarraFiltros filtros={filtros} provedores={provedores} generos={generos} />`

Comportamento travado pelos testes: qualquer mudança de filtro reescreve a URL com `router.push(..., { scroll: false })` e **volta para a página 1** — continuar na página 7 depois de trocar o gênero devolveria uma tela vazia sem motivo.

- [ ] **Step 1: Escrever os testes**

`src/components/filtros/BarraFiltros.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { FILTROS_PADRAO } from '@/lib/filtros'

const { estado } = vi.hoisted(() => ({ estado: { push: vi.fn() } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: estado.push }),
}))

const provedores = [
  { id: 8, nome: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/n.jpg', prioridade: 1 },
  { id: 119, nome: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/w92/a.jpg', prioridade: 2 },
]
const generos = [
  { id: 35, nome: 'Comédia' },
  { id: 28, nome: 'Ação' },
]

const urlDoPush = () => new URL(estado.push.mock.calls.at(-1)![0], 'http://x')

describe('BarraFiltros', () => {
  beforeEach(() => estado.push.mockClear())

  it('liga um serviço e reescreve a URL', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))

    expect(urlDoPush().searchParams.get('servicos')).toBe('8')
    expect(estado.push.mock.calls.at(-1)![1]).toEqual({ scroll: false })
  })

  it('desliga um serviço já ativo', async () => {
    render(
      <BarraFiltros filtros={{ ...FILTROS_PADRAO, servicos: [8, 119] }} provedores={provedores} generos={generos} />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))

    expect(urlDoPush().searchParams.get('servicos')).toBe('119')
  })

  it('volta para a página 1 ao mexer em qualquer filtro', async () => {
    render(
      <BarraFiltros filtros={{ ...FILTROS_PADRAO, pagina: 7 }} provedores={provedores} generos={generos} />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Comédia' }))

    expect(urlDoPush().searchParams.get('pagina')).toBeNull()
    expect(urlDoPush().searchParams.get('generos')).toBe('35')
  })

  it('escreve a nota mínima escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    expect(urlDoPush().searchParams.get('nota')).toBe('7')
  })

  it('escreve a duração máxima escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Duração máxima'), '120')

    expect(urlDoPush().searchParams.get('duracao')).toBe('120')
  })

  it('escreve a ordenação escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'nota')

    expect(urlDoPush().searchParams.get('ordem')).toBe('nota')
  })

  it('marca visualmente os filtros ativos', () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, servicos: [8], generos: [35], notaMinima: 7 }}
        provedores={provedores}
        generos={generos}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Comédia' })).toBeChecked()
    expect(screen.getByLabelText('Nota mínima')).toHaveValue('7')
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/components/filtros`
Expected: FAIL — `BarraFiltros` não existe.

- [ ] **Step 3: Implementar**

`src/components/filtros/BarraFiltros.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { escreverFiltros } from '@/lib/filtros'
import type { Filtros, Genero, Provedor } from '@/lib/tipos'

const NOTAS = [6, 7, 8]
const DURACOES = [90, 120, 150]
const ORDENS: { valor: Filtros['ordenacao']; rotulo: string }[] = [
  { valor: 'popularidade', rotulo: 'Mais populares' },
  { valor: 'nota', rotulo: 'Melhor avaliados' },
  { valor: 'lancamento', rotulo: 'Mais recentes' },
]

const alternar = (lista: number[], id: number): number[] =>
  lista.includes(id) ? lista.filter((i) => i !== id) : [...lista, id]

export function BarraFiltros({
  filtros,
  provedores,
  generos,
}: {
  filtros: Filtros
  provedores: Provedor[]
  generos: Genero[]
}) {
  const router = useRouter()

  // Mexer em qualquer filtro volta para a página 1: manter a página antiga
  // deixaria a tela vazia sem motivo aparente.
  const aplicar = (mudanca: Partial<Filtros>) => {
    const novos = { ...filtros, ...mudanca, pagina: 1 }
    router.push(`/?${escreverFiltros(novos).toString()}`, { scroll: false })
  }

  return (
    <section aria-label="Filtros">
      <fieldset>
        <legend>Serviços</legend>
        {provedores.map((provedor) => (
          <label key={provedor.id}>
            <input
              type="checkbox"
              checked={filtros.servicos.includes(provedor.id)}
              onChange={() => aplicar({ servicos: alternar(filtros.servicos, provedor.id) })}
            />
            {provedor.nome}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Gêneros</legend>
        {generos.map((genero) => (
          <label key={genero.id}>
            <input
              type="checkbox"
              checked={filtros.generos.includes(genero.id)}
              onChange={() => aplicar({ generos: alternar(filtros.generos, genero.id) })}
            />
            {genero.nome}
          </label>
        ))}
      </fieldset>

      <label>
        Nota mínima
        <select
          value={filtros.notaMinima ?? ''}
          onChange={(evento) =>
            aplicar({ notaMinima: evento.target.value === '' ? null : Number(evento.target.value) })
          }
        >
          <option value="">Qualquer</option>
          {NOTAS.map((nota) => (
            <option key={nota} value={nota}>
              {nota} ou mais
            </option>
          ))}
        </select>
      </label>

      <label>
        Duração máxima
        <select
          value={filtros.duracaoMaxMin ?? ''}
          onChange={(evento) =>
            aplicar({
              duracaoMaxMin: evento.target.value === '' ? null : Number(evento.target.value),
            })
          }
        >
          <option value="">Qualquer</option>
          {DURACOES.map((minutos) => (
            <option key={minutos} value={minutos}>
              até {minutos} min
            </option>
          ))}
        </select>
      </label>

      <label>
        Ordenar por
        <select
          value={filtros.ordenacao}
          onChange={(evento) => aplicar({ ordenacao: evento.target.value as Filtros['ordenacao'] })}
        >
          {ORDENS.map((ordem) => (
            <option key={ordem.valor} value={ordem.valor}>
              {ordem.rotulo}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
```

- [ ] **Step 4: Ligar a barra na home**

Em `src/app/page.tsx`, carregue provedores e gêneros em paralelo e renderize a barra acima da grade:

```tsx
import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { GradeFilmes } from '@/components/filme/GradeFilmes'
import { lerFiltros, type ParamsBrutos } from '@/lib/filtros'
import { lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { descobrirFilmes, listarGeneros, listarProvedores } from '@/lib/tmdb'

export default async function Home({ searchParams }: { searchParams: Promise<ParamsBrutos> }) {
  const filtros = lerFiltros(await searchParams, await lerServicosDoCookie())
  const [pagina, provedores, generos] = await Promise.all([
    descobrirFilmes(filtros),
    listarProvedores(),
    listarGeneros(),
  ])

  return (
    <main>
      <h1>O que assistir hoje</h1>
      <BarraFiltros filtros={filtros} provedores={provedores} generos={generos} />
      <p>{pagina.totalResultados} filmes encontrados</p>
      <GradeFilmes filmes={pagina.filmes} />
    </main>
  )
}
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 7 novos testes, nenhum antigo quebrado.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: barra de filtros com a URL como fonte de verdade"
```

---

### Task 9: Seleção de serviços na primeira visita

**Files:**
- Create: `src/components/filtros/SelecaoServicos.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/filtros/SelecaoServicos.test.tsx`

**Interfaces:**
- Consumes: `salvarServicos` de `@/lib/preferencias/servicos-cliente`, `escolheuServicos` de `@/lib/preferencias/servicos-servidor`, `listarProvedores`.
- Produces: `<SelecaoServicos provedores={provedores} />`

A home decide entre a seleção e a grade pela **presença** do cookie, não pelo seu conteúdo — quem escolheu "nenhum serviço" tem um cookie vazio e não deve ver a tela de novo. Por isso `escolheuServicos()` existe separado de `lerServicosDoCookie()`.

- [ ] **Step 1: Escrever os testes**

`src/components/filtros/SelecaoServicos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SelecaoServicos } from '@/components/filtros/SelecaoServicos'

const { estado } = vi.hoisted(() => ({
  estado: { salvar: vi.fn(), refresh: vi.fn() },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: estado.refresh }) }))
vi.mock('@/lib/preferencias/servicos-cliente', () => ({ salvarServicos: estado.salvar }))

const provedores = [
  { id: 8, nome: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/n.jpg', prioridade: 1 },
  { id: 119, nome: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/w92/a.jpg', prioridade: 2 },
]

describe('SelecaoServicos', () => {
  beforeEach(() => {
    estado.salvar.mockClear()
    estado.refresh.mockClear()
  })

  it('salva os serviços marcados e atualiza a página', async () => {
    render(<SelecaoServicos provedores={provedores} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))
    await userEvent.click(screen.getByRole('button', { name: /ver filmes/i }))

    expect(estado.salvar).toHaveBeenCalledWith([8])
    expect(estado.refresh).toHaveBeenCalled()
  })

  it('permite entrar sem escolher nada', async () => {
    render(<SelecaoServicos provedores={provedores} />)

    await userEvent.click(screen.getByRole('button', { name: /pular/i }))

    expect(estado.salvar).toHaveBeenCalledWith([])
  })

  it('mostra o logo de cada serviço com o nome como alternativa', () => {
    render(<SelecaoServicos provedores={provedores} />)
    expect(screen.getByAltText('Netflix')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/components/filtros/SelecaoServicos.test.tsx`
Expected: FAIL — `SelecaoServicos` não existe.

- [ ] **Step 3: Implementar**

`src/components/filtros/SelecaoServicos.tsx`:

```tsx
'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { salvarServicos } from '@/lib/preferencias/servicos-cliente'
import type { Provedor } from '@/lib/tipos'

export function SelecaoServicos({ provedores }: { provedores: Provedor[] }) {
  const router = useRouter()
  const [escolhidos, setEscolhidos] = useState<number[]>([])

  const confirmar = (ids: number[]) => {
    salvarServicos(ids)
    router.refresh()
  }

  return (
    <main>
      <h1>Quais serviços você assina?</h1>
      <p>Assim eu mostro só o que dá para assistir sem pagar de novo.</p>

      <ul>
        {provedores.map((provedor) => (
          <li key={provedor.id}>
            <label>
              <input
                type="checkbox"
                checked={escolhidos.includes(provedor.id)}
                onChange={() =>
                  setEscolhidos((atual) =>
                    atual.includes(provedor.id)
                      ? atual.filter((id) => id !== provedor.id)
                      : [...atual, provedor.id],
                  )
                }
              />
              {/* O nome vem do alt: repeti-lo num <span> faria o leitor de tela
                  anunciar "Netflix Netflix" e quebraria a busca por nome no teste. */}
              <Image src={provedor.logo} alt={provedor.nome} width={46} height={46} />
            </label>
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => confirmar(escolhidos)}>
        Ver filmes
      </button>
      <button type="button" onClick={() => confirmar([])}>
        Pular por enquanto
      </button>
    </main>
  )
}
```

- [ ] **Step 4: Ligar na home**

Em `src/app/page.tsx`, antes de buscar filmes:

```tsx
import { SelecaoServicos } from '@/components/filtros/SelecaoServicos'
import { escolheuServicos, lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'

// dentro de Home, como primeira coisa:
if (!(await escolheuServicos())) {
  return <SelecaoServicos provedores={await listarProvedores()} />
}
```

Como a decisão acontece no servidor, não existe piscar: ou vem a seleção, ou vem a grade já filtrada.

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 3 novos testes.

- [ ] **Step 6: Conferir no navegador**

Run: `npm run dev`, abrir em janela anônima
Expected: a primeira visita mostra a seleção de serviços; depois de confirmar, a grade aparece filtrada e a seleção não volta a aparecer.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: seleção de serviços na primeira visita gravada em cookie"
```

---

### Task 10: Carregar mais páginas

**Files:**
- Create: `src/app/api/descobrir/route.ts`, `src/components/filme/CarregarMais.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/app/api/descobrir/route.test.ts`, `src/components/filme/CarregarMais.test.tsx`

**Interfaces:**
- Consumes: `descobrirFilmes`, `lerFiltros`, `lerServicosDoCookie`, `ErroTmdb`.
- Produces:
  - `GET /api/descobrir?<filtros>&pagina=N` → `{ filmes: Filme[]; totalPaginas: number; totalResultados: number }`; em erro, `{ erro: string }` com o status do TMDB.
  - `<CarregarMais filtros={filtros} paginaAtual={n} totalPaginas={n} />` — anexa os filmes carregados abaixo da grade renderizada no servidor.

- [ ] **Step 1: Escrever o teste da rota**

`src/app/api/descobrir/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroTmdb } from '@/lib/tmdb/cliente'
import { GET } from './route'

const { estado } = vi.hoisted(() => ({ estado: { descobrir: vi.fn(), servicos: [] as number[] } }))

vi.mock('@/lib/tmdb', () => ({ descobrirFilmes: estado.descobrir }))
vi.mock('@/lib/preferencias/servicos-servidor', () => ({
  lerServicosDoCookie: async () => estado.servicos,
}))

const paginaVazia = { filmes: [], totalPaginas: 1, totalResultados: 0 }

describe('GET /api/descobrir', () => {
  beforeEach(() => {
    estado.descobrir.mockReset().mockResolvedValue(paginaVazia)
    estado.servicos = []
  })

  it('devolve a página pedida com os filtros da URL', async () => {
    estado.descobrir.mockResolvedValue({
      filmes: [{ id: 1, titulo: 'Filme', sinopse: null, poster: null, backdrop: null, nota: 7, votos: 200, ano: 2020 }],
      totalPaginas: 5,
      totalResultados: 100,
    })

    const resposta = await GET(new Request('http://x/api/descobrir?servicos=8&pagina=3'))

    expect(resposta.status).toBe(200)
    await expect(resposta.json()).resolves.toMatchObject({ totalPaginas: 5 })
    expect(estado.descobrir).toHaveBeenCalledWith(
      expect.objectContaining({ servicos: [8], pagina: 3 }),
    )
  })

  it('usa os serviços do cookie quando a URL não os traz', async () => {
    estado.servicos = [119]

    await GET(new Request('http://x/api/descobrir?pagina=2'))

    expect(estado.descobrir).toHaveBeenCalledWith(expect.objectContaining({ servicos: [119] }))
  })

  it('repassa o status do TMDB quando ele falha', async () => {
    estado.descobrir.mockRejectedValue(new ErroTmdb(429, 'TMDB respondeu 429'))

    const resposta = await GET(new Request('http://x/api/descobrir?pagina=2'))

    expect(resposta.status).toBe(429)
    await expect(resposta.json()).resolves.toHaveProperty('erro')
  })

  it('devolve 500 para erro inesperado', async () => {
    estado.descobrir.mockRejectedValue(new Error('boom'))

    expect((await GET(new Request('http://x/api/descobrir'))).status).toBe(500)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/app/api/descobrir`
Expected: FAIL — `./route` não existe.

- [ ] **Step 3: Implementar a rota**

`src/app/api/descobrir/route.ts`:

```ts
import { lerFiltros } from '@/lib/filtros'
import { lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { descobrirFilmes } from '@/lib/tmdb'
import { ErroTmdb } from '@/lib/tmdb/cliente'

export async function GET(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filtros = lerFiltros(params, await lerServicosDoCookie())

  try {
    return Response.json(await descobrirFilmes(filtros))
  } catch (erro) {
    const status = erro instanceof ErroTmdb ? erro.status : 500
    return Response.json({ erro: 'Não consegui falar com o TMDB agora.' }, { status })
  }
}
```

- [ ] **Step 4: Escrever o teste do botão**

`src/components/filme/CarregarMais.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CarregarMais } from '@/components/filme/CarregarMais'
import { FILTROS_PADRAO } from '@/lib/filtros'

const filme = (id: number) => ({
  id,
  titulo: `Filme ${id}`,
  sinopse: null,
  poster: null,
  backdrop: null,
  nota: 7,
  votos: 200,
  ano: 2020,
})

afterEach(() => vi.unstubAllGlobals())

describe('CarregarMais', () => {
  it('acrescenta a próxima página à lista', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ filmes: [filme(2)], totalPaginas: 3, totalResultados: 60 }),
      }),
    )

    render(<CarregarMais filtros={FILTROS_PADRAO} paginaAtual={1} totalPaginas={3} />)
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }))

    expect(await screen.findByText('Filme 2')).toBeInTheDocument()
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(new URL(url, 'http://x').searchParams.get('pagina')).toBe('2')
  })

  it('some quando a última página já foi carregada', () => {
    render(<CarregarMais filtros={FILTROS_PADRAO} paginaAtual={3} totalPaginas={3} />)
    expect(screen.queryByRole('button', { name: /carregar mais/i })).not.toBeInTheDocument()
  })

  it('mostra recado quando a API falha e mantém o botão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))

    render(<CarregarMais filtros={FILTROS_PADRAO} paginaAtual={1} totalPaginas={3} />)
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não consegui carregar/i)
    expect(screen.getByRole('button', { name: /carregar mais/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Implementar o botão**

`src/components/filme/CarregarMais.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { GradeFilmes } from './GradeFilmes'
import { escreverFiltros } from '@/lib/filtros'
import type { Filme, Filtros } from '@/lib/tipos'

export function CarregarMais({
  filtros,
  paginaAtual,
  totalPaginas,
}: {
  filtros: Filtros
  paginaAtual: number
  totalPaginas: number
}) {
  const [extras, setExtras] = useState<Filme[]>([])
  const [ultimaPagina, setUltimaPagina] = useState(paginaAtual)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)

  const acabou = ultimaPagina >= totalPaginas

  const carregar = async () => {
    setCarregando(true)
    setErro(false)
    const proxima = ultimaPagina + 1
    const params = escreverFiltros({ ...filtros, pagina: proxima })

    try {
      const resposta = await fetch(`/api/descobrir?${params.toString()}`)
      if (!resposta.ok) throw new Error('falhou')
      const dados = (await resposta.json()) as { filmes: Filme[] }
      setExtras((atuais) => [...atuais, ...dados.filmes])
      setUltimaPagina(proxima)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      {extras.length > 0 && <GradeFilmes filmes={extras} />}
      {erro && <p role="alert">Não consegui carregar mais filmes. Tente de novo.</p>}
      {!acabou && (
        <button type="button" onClick={carregar} disabled={carregando}>
          {carregando ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </>
  )
}
```

- [ ] **Step 6: Ligar na home**

Abaixo da `<GradeFilmes>` em `src/app/page.tsx`:

```tsx
<CarregarMais filtros={filtros} paginaAtual={filtros.pagina} totalPaginas={pagina.totalPaginas} />
```

- [ ] **Step 7: Rodar tudo e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 7 novos testes.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: carregar mais páginas sem sair da grade"
```

---

### Task 11: Surpreenda-me

**Files:**
- Create: `src/app/api/sortear/route.ts`, `src/components/filme/BotaoSurpreendaMe.tsx`, `src/components/filme/PainelSorteio.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/app/api/sortear/route.test.ts`, `src/components/filme/BotaoSurpreendaMe.test.tsx`

**Interfaces:**
- Consumes: `descobrirFilmes`, `escolherAlvo`, `itensNaUltimaPagina`, `lerFiltros`, `lerServicosDoCookie`.
- Produces:
  - `GET /api/sortear?<filtros>` → `{ filme: Filme | null }`
  - `<BotaoSurpreendaMe filtros={filtros} />`
  - `<PainelSorteio filme={filme | null} carregando={boolean} aoFechar={fn} aoSortearDeNovo={fn} />`

A rota reaproveita a página 1 quando o sorteio cai nela — economiza uma chamada em boa parte dos casos.

- [ ] **Step 1: Escrever o teste da rota**

`src/app/api/sortear/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { estado } = vi.hoisted(() => ({ estado: { descobrir: vi.fn() } }))

vi.mock('@/lib/tmdb', () => ({ descobrirFilmes: estado.descobrir }))
vi.mock('@/lib/preferencias/servicos-servidor', () => ({ lerServicosDoCookie: async () => [] }))

const filme = (id: number) => ({
  id,
  titulo: `Filme ${id}`,
  sinopse: null,
  poster: null,
  backdrop: null,
  nota: 7,
  votos: 200,
  ano: 2020,
})

describe('GET /api/sortear', () => {
  beforeEach(() => estado.descobrir.mockReset())

  it('devolve null quando nenhum filme atende aos filtros', async () => {
    estado.descobrir.mockResolvedValue({ filmes: [], totalPaginas: 0, totalResultados: 0 })

    const resposta = await GET(new Request('http://x/api/sortear'))

    await expect(resposta.json()).resolves.toEqual({ filme: null })
  })

  it('sorteia entre todas as páginas, não só entre as visíveis', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0)
    estado.descobrir
      .mockResolvedValueOnce({ filmes: [filme(1)], totalPaginas: 10, totalResultados: 200 })
      .mockResolvedValueOnce({ filmes: [filme(99)], totalPaginas: 10, totalResultados: 200 })

    const resposta = await GET(new Request('http://x/api/sortear'))

    expect(estado.descobrir).toHaveBeenNthCalledWith(2, expect.objectContaining({ pagina: 6 }))
    await expect(resposta.json()).resolves.toEqual({ filme: filme(99) })
    vi.restoreAllMocks()
  })

  it('reaproveita a primeira página quando o sorteio cai nela', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    estado.descobrir.mockResolvedValue({
      filmes: [filme(1), filme(2)],
      totalPaginas: 4,
      totalResultados: 80,
    })

    const resposta = await GET(new Request('http://x/api/sortear'))

    expect(estado.descobrir).toHaveBeenCalledTimes(1)
    await expect(resposta.json()).resolves.toEqual({ filme: filme(1) })
    vi.restoreAllMocks()
  })

  it('devolve 500 quando o TMDB falha', async () => {
    estado.descobrir.mockRejectedValue(new Error('boom'))
    expect((await GET(new Request('http://x/api/sortear'))).status).toBe(500)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/app/api/sortear`
Expected: FAIL — `./route` não existe.

- [ ] **Step 3: Implementar a rota**

`src/app/api/sortear/route.ts`:

```ts
import { lerFiltros } from '@/lib/filtros'
import { lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { escolherAlvo, itensNaUltimaPagina } from '@/lib/sorteio'
import { descobrirFilmes } from '@/lib/tmdb'
import { ErroTmdb } from '@/lib/tmdb/cliente'

export async function GET(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filtros = lerFiltros(params, await lerServicosDoCookie())

  try {
    const primeira = await descobrirFilmes({ ...filtros, pagina: 1 })
    const alvo = escolherAlvo(
      primeira.totalPaginas,
      itensNaUltimaPagina(primeira.totalResultados, primeira.totalPaginas),
      Math.random,
    )

    if (alvo === null) return Response.json({ filme: null })

    const pagina =
      alvo.pagina === 1 ? primeira : await descobrirFilmes({ ...filtros, pagina: alvo.pagina })

    return Response.json({ filme: pagina.filmes[alvo.indice] ?? pagina.filmes[0] ?? null })
  } catch (erro) {
    const status = erro instanceof ErroTmdb ? erro.status : 500
    return Response.json({ erro: 'Não consegui sortear agora.' }, { status })
  }
}
```

- [ ] **Step 4: Escrever o teste do botão**

`src/components/filme/BotaoSurpreendaMe.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotaoSurpreendaMe } from '@/components/filme/BotaoSurpreendaMe'
import { FILTROS_PADRAO } from '@/lib/filtros'

const filme = {
  id: 27205,
  titulo: 'A Origem',
  sinopse: 'Um ladrão que invade sonhos.',
  poster: null,
  backdrop: null,
  nota: 8.4,
  votos: 35000,
  ano: 2010,
}

const respostaCom = (corpo: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => corpo })

afterEach(() => vi.unstubAllGlobals())

describe('BotaoSurpreendaMe', () => {
  it('mostra o filme sorteado num diálogo', async () => {
    vi.stubGlobal('fetch', respostaCom({ filme }))

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('A Origem')
    expect(screen.getByRole('link', { name: /ver detalhes/i })).toHaveAttribute(
      'href',
      '/filme/27205',
    )
  })

  it('leva os filtros atuais para a rota de sorteio', async () => {
    const fetchFalso = respostaCom({ filme })
    vi.stubGlobal('fetch', fetchFalso)

    render(<BotaoSurpreendaMe filtros={{ ...FILTROS_PADRAO, servicos: [8], notaMinima: 7 }} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))
    await screen.findByRole('dialog')

    const url = new URL(fetchFalso.mock.calls[0][0] as string, 'http://x')
    expect(url.searchParams.get('servicos')).toBe('8')
    expect(url.searchParams.get('nota')).toBe('7')
  })

  it('explica quando nenhum filme atende aos filtros', async () => {
    vi.stubGlobal('fetch', respostaCom({ filme: null }))

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))

    expect(await screen.findByRole('dialog')).toHaveTextContent(/nenhum filme/i)
  })

  it('sorteia de novo sem fechar o diálogo', async () => {
    const fetchFalso = respostaCom({ filme })
    vi.stubGlobal('fetch', fetchFalso)

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: /sortear de novo/i }))

    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('fecha o diálogo', async () => {
    vi.stubGlobal('fetch', respostaCom({ filme }))

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Implementar os componentes**

`src/components/filme/PainelSorteio.tsx`:

```tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import type { Filme } from '@/lib/tipos'

export function PainelSorteio({
  filme,
  carregando,
  aoFechar,
  aoSortearDeNovo,
}: {
  filme: Filme | null
  carregando: boolean
  aoFechar: () => void
  aoSortearDeNovo: () => void
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Filme sorteado">
      {carregando && <p>Sorteando…</p>}

      {!carregando && filme === null && (
        <p>Nenhum filme atende a esses filtros. Tente afrouxar algum deles.</p>
      )}

      {!carregando && filme !== null && (
        <>
          {filme.poster && <Image src={filme.poster} alt={filme.titulo} width={342} height={513} />}
          <h2>{filme.titulo}</h2>
          <p>
            {filme.nota.toFixed(1)}
            {filme.ano !== null && ` · ${filme.ano}`}
          </p>
          {filme.sinopse && <p>{filme.sinopse}</p>}
          <Link href={`/filme/${filme.id}`}>Ver detalhes</Link>
        </>
      )}

      <button type="button" onClick={aoSortearDeNovo}>
        Sortear de novo
      </button>
      <button type="button" onClick={aoFechar}>
        Fechar
      </button>
    </div>
  )
}
```

`src/components/filme/BotaoSurpreendaMe.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { PainelSorteio } from './PainelSorteio'
import { escreverFiltros } from '@/lib/filtros'
import type { Filme, Filtros } from '@/lib/tipos'

export function BotaoSurpreendaMe({ filtros }: { filtros: Filtros }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [filme, setFilme] = useState<Filme | null>(null)

  const sortear = async () => {
    setAberto(true)
    setCarregando(true)
    try {
      const resposta = await fetch(`/api/sortear?${escreverFiltros(filtros).toString()}`)
      const dados = (await resposta.json()) as { filme?: Filme | null }
      setFilme(resposta.ok ? (dados.filme ?? null) : null)
    } catch {
      setFilme(null)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <button type="button" onClick={sortear}>
        Surpreenda-me
      </button>
      {aberto && (
        <PainelSorteio
          filme={filme}
          carregando={carregando}
          aoFechar={() => setAberto(false)}
          aoSortearDeNovo={sortear}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Ligar na home**

Ao lado da `<BarraFiltros>` em `src/app/page.tsx`:

```tsx
<BotaoSurpreendaMe filtros={filtros} />
```

- [ ] **Step 7: Rodar tudo e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 9 novos testes.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: sorteio entre todos os resultados do filtro atual"
```

---

### Task 12: Estado vazio que sugere o que afrouxar

**Files:**
- Create: `src/lib/filtros/afrouxar.ts`, `src/lib/tmdb/sugestoes.ts`, `src/components/filtros/EstadoVazio.tsx`
- Modify: `src/lib/filtros/index.ts`, `src/app/page.tsx`
- Test: `src/lib/filtros/afrouxar.test.ts`, `src/lib/tmdb/sugestoes.test.ts`, `src/components/filtros/EstadoVazio.test.tsx`

**Interfaces:**
- Consumes: `Filtros`, `descobrirFilmes`.
- Produces:
  - `type RotuloFiltro = 'servicos' | 'generos' | 'nota' | 'duracao' | 'periodo'`
  - `variantesAfrouxadas(filtros: Filtros): { rotulo: RotuloFiltro; filtros: Filtros }[]`
  - `type Sugestao = { rotulo: RotuloFiltro; ganho: number; filtros: Filtros }`
  - `sugerirAfrouxamento(filtros: Filtros): Promise<Sugestao | null>`
  - `<EstadoVazio sugestao={sugestao} />`

A busca só roda quando a grade veio vazia, e só para os filtros ativos — no pior caso são cinco chamadas, todas cacheadas pelo Next.

- [ ] **Step 1: Escrever o teste das variantes**

`src/lib/filtros/afrouxar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FILTROS_PADRAO } from '@/lib/filtros'
import { variantesAfrouxadas } from '@/lib/filtros/afrouxar'

describe('variantesAfrouxadas', () => {
  it('não sugere nada quando não há filtro ativo', () => {
    expect(variantesAfrouxadas(FILTROS_PADRAO)).toEqual([])
  })

  it('gera uma variante por filtro ativo', () => {
    const variantes = variantesAfrouxadas({
      ...FILTROS_PADRAO,
      servicos: [8],
      generos: [35],
      notaMinima: 8,
      duracaoMaxMin: 90,
      anoDe: 2020,
    })

    expect(variantes.map((v) => v.rotulo).sort()).toEqual([
      'duracao',
      'generos',
      'nota',
      'periodo',
      'servicos',
    ])
  })

  it('remove apenas o filtro da variante', () => {
    const variantes = variantesAfrouxadas({ ...FILTROS_PADRAO, servicos: [8], notaMinima: 8 })
    const semNota = variantes.find((v) => v.rotulo === 'nota')!

    expect(semNota.filtros.notaMinima).toBeNull()
    expect(semNota.filtros.servicos).toEqual([8])
  })

  it('remove as duas pontas do período de uma vez', () => {
    const variantes = variantesAfrouxadas({ ...FILTROS_PADRAO, anoDe: 1990, anoAte: 1999 })

    expect(variantes).toHaveLength(1)
    expect(variantes[0].filtros.anoDe).toBeNull()
    expect(variantes[0].filtros.anoAte).toBeNull()
  })

  it('sempre volta para a página 1', () => {
    const variantes = variantesAfrouxadas({ ...FILTROS_PADRAO, notaMinima: 8, pagina: 4 })
    expect(variantes[0].filtros.pagina).toBe(1)
  })
})
```

- [ ] **Step 2: Implementar as variantes**

`src/lib/filtros/afrouxar.ts`:

```ts
import type { Filtros } from '@/lib/tipos'

export type RotuloFiltro = 'servicos' | 'generos' | 'nota' | 'duracao' | 'periodo'

export type Variante = { rotulo: RotuloFiltro; filtros: Filtros }

export function variantesAfrouxadas(filtros: Filtros): Variante[] {
  const base = { ...filtros, pagina: 1 }
  const variantes: Variante[] = []

  if (filtros.servicos.length > 0) variantes.push({ rotulo: 'servicos', filtros: { ...base, servicos: [] } })
  if (filtros.generos.length > 0) variantes.push({ rotulo: 'generos', filtros: { ...base, generos: [] } })
  if (filtros.notaMinima !== null) variantes.push({ rotulo: 'nota', filtros: { ...base, notaMinima: null } })
  if (filtros.duracaoMaxMin !== null)
    variantes.push({ rotulo: 'duracao', filtros: { ...base, duracaoMaxMin: null } })
  if (filtros.anoDe !== null || filtros.anoAte !== null)
    variantes.push({ rotulo: 'periodo', filtros: { ...base, anoDe: null, anoAte: null } })

  return variantes
}
```

Acrescente ao `src/lib/filtros/index.ts`:

```ts
export { variantesAfrouxadas, type RotuloFiltro, type Variante } from './afrouxar'
```

- [ ] **Step 3: Escrever o teste da sugestão**

`src/lib/tmdb/sugestoes.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FILTROS_PADRAO } from '@/lib/filtros'
import { sugerirAfrouxamento } from '@/lib/tmdb/sugestoes'

const { estado } = vi.hoisted(() => ({ estado: { descobrir: vi.fn() } }))
vi.mock('@/lib/tmdb', () => ({ descobrirFilmes: estado.descobrir }))

const comResultados = (total: number) => ({ filmes: [], totalPaginas: 1, totalResultados: total })

describe('sugerirAfrouxamento', () => {
  beforeEach(() => estado.descobrir.mockReset())

  it('devolve null quando não há filtro para afrouxar', async () => {
    expect(await sugerirAfrouxamento(FILTROS_PADRAO)).toBeNull()
    expect(estado.descobrir).not.toHaveBeenCalled()
  })

  it('escolhe o filtro cuja remoção libera mais filmes', async () => {
    estado.descobrir.mockImplementation(async (filtros: typeof FILTROS_PADRAO) =>
      filtros.notaMinima === null ? comResultados(120) : comResultados(4),
    )

    const sugestao = await sugerirAfrouxamento({ ...FILTROS_PADRAO, notaMinima: 9, generos: [35] })

    expect(sugestao).toMatchObject({ rotulo: 'nota', ganho: 120 })
    expect(sugestao?.filtros.notaMinima).toBeNull()
  })

  it('devolve null quando nenhuma variante traz resultado', async () => {
    estado.descobrir.mockResolvedValue(comResultados(0))
    expect(await sugerirAfrouxamento({ ...FILTROS_PADRAO, notaMinima: 9 })).toBeNull()
  })

  it('ignora variantes que falharam em vez de derrubar a página', async () => {
    estado.descobrir
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(comResultados(30))

    const sugestao = await sugerirAfrouxamento({ ...FILTROS_PADRAO, notaMinima: 9, duracaoMaxMin: 90 })

    expect(sugestao?.ganho).toBe(30)
  })
})
```

- [ ] **Step 4: Implementar a sugestão**

`src/lib/tmdb/sugestoes.ts`:

```ts
import 'server-only'
import { variantesAfrouxadas, type RotuloFiltro } from '@/lib/filtros'
import type { Filtros } from '@/lib/tipos'
import { descobrirFilmes } from '@/lib/tmdb'

export type Sugestao = { rotulo: RotuloFiltro; ganho: number; filtros: Filtros }

export async function sugerirAfrouxamento(filtros: Filtros): Promise<Sugestao | null> {
  const variantes = variantesAfrouxadas(filtros)
  if (variantes.length === 0) return null

  const contagens = await Promise.all(
    variantes.map(async (variante) => {
      try {
        const pagina = await descobrirFilmes(variante.filtros)
        return { ...variante, ganho: pagina.totalResultados }
      } catch {
        // Uma variante que falhou não pode derrubar a página inteira.
        return { ...variante, ganho: 0 }
      }
    }),
  )

  const melhor = contagens.reduce((a, b) => (b.ganho > a.ganho ? b : a))
  return melhor.ganho > 0 ? melhor : null
}
```

- [ ] **Step 5: Escrever o teste do componente**

`src/components/filtros/EstadoVazio.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EstadoVazio } from '@/components/filtros/EstadoVazio'
import { FILTROS_PADRAO } from '@/lib/filtros'

describe('EstadoVazio', () => {
  it('avisa que não há resultados quando não há sugestão', () => {
    render(<EstadoVazio sugestao={null} />)
    expect(screen.getByText(/nenhum filme/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('oferece remover o filtro mais restritivo com um clique', () => {
    render(
      <EstadoVazio
        sugestao={{ rotulo: 'nota', ganho: 120, filtros: { ...FILTROS_PADRAO, servicos: [8] } }}
      />,
    )

    const link = screen.getByRole('link', { name: /remover/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('servicos=8'))
    expect(screen.getByText(/120 filmes/)).toBeInTheDocument()
    expect(screen.getByText(/nota mínima/i)).toBeInTheDocument()
  })

  it('nomeia cada filtro de forma legível', () => {
    render(
      <EstadoVazio sugestao={{ rotulo: 'duracao', ganho: 9, filtros: FILTROS_PADRAO }} />,
    )
    expect(screen.getByText(/limite de duração/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Implementar o componente**

`src/components/filtros/EstadoVazio.tsx`:

```tsx
import Link from 'next/link'
import { escreverFiltros, type RotuloFiltro } from '@/lib/filtros'
import type { Sugestao } from '@/lib/tmdb/sugestoes'

const NOMES: Record<RotuloFiltro, string> = {
  servicos: 'o filtro de serviços',
  generos: 'os gêneros escolhidos',
  nota: 'a nota mínima',
  duracao: 'o limite de duração',
  periodo: 'o período de lançamento',
}

export function EstadoVazio({ sugestao }: { sugestao: Sugestao | null }) {
  if (sugestao === null) {
    return <p>Nenhum filme atende a esses filtros. Tente remover algum deles.</p>
  }

  return (
    <div>
      <p>
        Nenhum filme atende a esses filtros. Sem {NOMES[sugestao.rotulo]}, aparecem{' '}
        {sugestao.ganho} filmes.
      </p>
      <Link href={`/?${escreverFiltros(sugestao.filtros).toString()}`}>Remover esse filtro</Link>
    </div>
  )
}
```

- [ ] **Step 7: Ligar na home**

Em `src/app/page.tsx`, no lugar da grade quando não há resultados:

```tsx
{pagina.filmes.length === 0 ? (
  <EstadoVazio sugestao={await sugerirAfrouxamento(filtros)} />
) : (
  <>
    <GradeFilmes filmes={pagina.filmes} />
    <CarregarMais filtros={filtros} paginaAtual={filtros.pagina} totalPaginas={pagina.totalPaginas} />
  </>
)}
```

- [ ] **Step 8: Rodar tudo e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 12 novos testes.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: estado vazio aponta o filtro que mais libera resultados"
```

---

### Task 13: Página de detalhe do filme

**Files:**
- Create: `src/app/filme/[id]/page.tsx`, `src/components/filme/OndeAssistir.tsx`
- Test: `src/components/filme/OndeAssistir.test.tsx`

**Interfaces:**
- Consumes: `obterFilme`, `obterDisponibilidade`, `ErroTmdb`, tipos `FilmeDetalhado`, `Disponibilidade`.
- Produces: `<OndeAssistir disponibilidade={disponibilidade} />`; rota `/filme/[id]` com `generateMetadata`.

Regras travadas pelos testes: grupos vazios não aparecem; quando **nenhum** grupo tem provedor, o bloco mostra "não disponível em streaming no Brasil no momento" em vez de sumir — a ausência é a informação; o botão de assistir só existe quando o TMDB devolveu o link do JustWatch.

- [ ] **Step 1: Escrever o teste**

`src/components/filme/OndeAssistir.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OndeAssistir } from '@/components/filme/OndeAssistir'
import type { Disponibilidade } from '@/lib/tipos'

const netflix = { id: 8, nome: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/n.jpg', prioridade: 1 }
const google = { id: 3, nome: 'Google Play', logo: 'https://image.tmdb.org/t/p/w92/g.jpg', prioridade: 5 }

const vazia: Disponibilidade = {
  assinatura: [],
  aluguel: [],
  compra: [],
  gratis: [],
  linkJustWatch: null,
}

describe('OndeAssistir', () => {
  it('mostra os grupos que têm provedor', () => {
    render(
      <OndeAssistir
        disponibilidade={{ ...vazia, assinatura: [netflix], aluguel: [google], linkJustWatch: 'https://jw' }}
      />,
    )

    expect(screen.getByText('Na assinatura')).toBeInTheDocument()
    expect(screen.getByAltText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Para alugar')).toBeInTheDocument()
    expect(screen.getByAltText('Google Play')).toBeInTheDocument()
  })

  it('omite os grupos vazios', () => {
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [netflix], linkJustWatch: 'https://jw' }} />)

    expect(screen.queryByText('Para alugar')).not.toBeInTheDocument()
    expect(screen.queryByText('Para comprar')).not.toBeInTheDocument()
  })

  it('diz explicitamente quando não há streaming no Brasil', () => {
    render(<OndeAssistir disponibilidade={vazia} />)
    expect(screen.getByText(/não disponível em streaming no Brasil no momento/i)).toBeInTheDocument()
  })

  it('leva ao JustWatch quando há link', () => {
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [netflix], linkJustWatch: 'https://jw' }} />)
    expect(screen.getByRole('link', { name: /assistir/i })).toHaveAttribute('href', 'https://jw')
  })

  it('não mostra botão de assistir sem link', () => {
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [netflix] }} />)
    expect(screen.queryByRole('link', { name: /assistir/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/filme/OndeAssistir.test.tsx`
Expected: FAIL — `OndeAssistir` não existe.

- [ ] **Step 3: Implementar o componente**

`src/components/filme/OndeAssistir.tsx`:

```tsx
import Image from 'next/image'
import type { Disponibilidade, Provedor } from '@/lib/tipos'

function Grupo({ titulo, provedores }: { titulo: string; provedores: Provedor[] }) {
  if (provedores.length === 0) return null

  return (
    <div>
      <h3>{titulo}</h3>
      <ul>
        {provedores.map((provedor) => (
          <li key={provedor.id}>
            <Image src={provedor.logo} alt={provedor.nome} width={46} height={46} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OndeAssistir({ disponibilidade }: { disponibilidade: Disponibilidade }) {
  const vazio =
    disponibilidade.assinatura.length === 0 &&
    disponibilidade.aluguel.length === 0 &&
    disponibilidade.compra.length === 0 &&
    disponibilidade.gratis.length === 0

  return (
    <section aria-labelledby="onde-assistir">
      <h2 id="onde-assistir">Onde assistir</h2>

      {vazio ? (
        <p>Não disponível em streaming no Brasil no momento.</p>
      ) : (
        <>
          <Grupo titulo="Na assinatura" provedores={disponibilidade.assinatura} />
          <Grupo titulo="De graça" provedores={disponibilidade.gratis} />
          <Grupo titulo="Para alugar" provedores={disponibilidade.aluguel} />
          <Grupo titulo="Para comprar" provedores={disponibilidade.compra} />
          {disponibilidade.linkJustWatch && (
            <a href={disponibilidade.linkJustWatch} target="_blank" rel="noreferrer">
              Assistir (via JustWatch)
            </a>
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Escrever a página de detalhe**

`src/app/filme/[id]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { OndeAssistir } from '@/components/filme/OndeAssistir'
import { obterDisponibilidade, obterFilme } from '@/lib/tmdb'
import { ErroTmdb } from '@/lib/tmdb/cliente'

type Props = { params: Promise<{ id: string }> }

const lerId = (bruto: string): number => {
  const id = Number(bruto)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return id
}

async function carregar(id: number) {
  try {
    return await obterFilme(id)
  } catch (erro) {
    if (erro instanceof ErroTmdb && erro.status === 404) notFound()
    throw erro
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filme = await carregar(lerId((await params).id))
  return { title: `${filme.titulo} — O que assistir hoje` }
}

export default async function PaginaFilme({ params }: Props) {
  const id = lerId((await params).id)
  const [filme, disponibilidade] = await Promise.all([carregar(id), obterDisponibilidade(id)])

  return (
    <main>
      {filme.backdrop && <Image src={filme.backdrop} alt="" width={780} height={439} priority />}
      <h1>{filme.titulo}</h1>

      <p>
        {filme.nota.toFixed(1)} ({filme.votos} votos)
        {filme.ano !== null && ` · ${filme.ano}`}
        {filme.duracaoMin !== null && ` · ${filme.duracaoMin} min`}
      </p>

      {filme.generos.length > 0 && <p>{filme.generos.map((g) => g.nome).join(', ')}</p>}
      {filme.sinopse && <p>{filme.sinopse}</p>}

      <OndeAssistir disponibilidade={disponibilidade} />

      {filme.trailerYoutubeId && (
        <iframe
          title={`Trailer de ${filme.titulo}`}
          src={`https://www.youtube.com/embed/${filme.trailerYoutubeId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}

      {filme.elenco.length > 0 && (
        <section aria-labelledby="elenco">
          <h2 id="elenco">Elenco</h2>
          <ul>
            {filme.elenco.map((ator) => (
              <li key={ator.id}>
                {ator.foto && <Image src={ator.foto} alt={ator.nome} width={92} height={138} />}
                <span>{ator.nome}</span>
                <span>{ator.personagem}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
```

O `backdrop` recebe `alt=""` de propósito: é imagem decorativa, e um leitor de tela repetindo o título logo antes do `<h1>` só atrapalha.

- [ ] **Step 5: Rodar tudo e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: PASS — 5 novos testes; build sem erro.

- [ ] **Step 6: Conferir no navegador**

Run: `npm run dev`, abrir um filme pela grade
Expected: detalhe com sinopse, elenco, trailer e o bloco "Onde assistir"; um id inexistente como `/filme/999999999` cai na página 404.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: página de detalhe com elenco, trailer e onde assistir"
```

---

### Task 14: Busca por título

**Files:**
- Create: `src/components/layout/CampoBusca.tsx`, `src/app/busca/page.tsx`
- Modify: `src/components/layout/Cabecalho.tsx`
- Test: `src/components/layout/CampoBusca.test.tsx`

**Interfaces:**
- Consumes: `buscarPorTitulo`, `GradeFilmes`.
- Produces: `<CampoBusca />` no cabeçalho; rota `/busca?q=termo&pagina=N`.

A busca **não** aplica o filtro de serviços: quem digita um título quer saber onde ele está, inclusive fora do que assina.

- [ ] **Step 1: Escrever o teste**

`src/components/layout/CampoBusca.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampoBusca } from '@/components/layout/CampoBusca'

const { estado } = vi.hoisted(() => ({ estado: { push: vi.fn() } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: estado.push }) }))

describe('CampoBusca', () => {
  beforeEach(() => estado.push.mockClear())

  it('leva para a página de busca com o termo codificado', async () => {
    render(<CampoBusca />)

    await userEvent.type(screen.getByRole('searchbox', { name: /buscar/i }), 'de volta para o futuro')
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(estado.push).toHaveBeenCalledWith('/busca?q=de+volta+para+o+futuro')
  })

  it('não busca com o campo vazio', async () => {
    render(<CampoBusca />)
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(estado.push).not.toHaveBeenCalled()
  })

  it('ignora um termo só de espaços', async () => {
    render(<CampoBusca />)
    await userEvent.type(screen.getByRole('searchbox', { name: /buscar/i }), '   ')
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(estado.push).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/layout/CampoBusca.test.tsx`
Expected: FAIL — `CampoBusca` não existe.

- [ ] **Step 3: Implementar o campo**

`src/components/layout/CampoBusca.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CampoBusca() {
  const router = useRouter()
  const [termo, setTermo] = useState('')

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault()
    const limpo = termo.trim()
    if (limpo === '') return
    router.push(`/busca?${new URLSearchParams({ q: limpo }).toString()}`)
  }

  return (
    <form role="search" onSubmit={buscar}>
      <label htmlFor="busca">Buscar filme</label>
      <input
        id="busca"
        type="search"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
      />
      <button type="submit">Buscar</button>
    </form>
  )
}
```

- [ ] **Step 4: Escrever a página de busca**

`src/app/busca/page.tsx`:

```tsx
import { GradeFilmes } from '@/components/filme/GradeFilmes'
import { buscarPorTitulo } from '@/lib/tmdb'

export default async function PaginaBusca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const bruto = (await searchParams).q
  const termo = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim() ?? ''

  if (termo === '') {
    return (
      <main>
        <h1>Buscar filme</h1>
        <p>Digite o nome de um filme para ver onde ele está disponível.</p>
      </main>
    )
  }

  const pagina = await buscarPorTitulo(termo, 1)

  return (
    <main>
      <h1>Resultados para “{termo}”</h1>
      {pagina.filmes.length === 0 ? (
        <p>Nenhum filme encontrado com esse nome.</p>
      ) : (
        <GradeFilmes filmes={pagina.filmes} />
      )}
    </main>
  )
}
```

- [ ] **Step 5: Colocar o campo no cabeçalho**

Em `src/components/layout/Cabecalho.tsx`, adicione `<CampoBusca />` dentro do `<header>`.

- [ ] **Step 6: Rodar tudo e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 3 novos testes.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: busca por título mostrando onde o filme está disponível"
```

---

### Task 15: Watchlist

**Files:**
- Create: `src/components/filme/BotaoWatchlist.tsx`, `src/app/minha-lista/page.tsx`
- Modify: `src/app/filme/[id]/page.tsx`
- Test: `src/components/filme/BotaoWatchlist.test.tsx`, `src/app/minha-lista/pagina.test.tsx`

**Interfaces:**
- Consumes: `lerWatchlist`, `alternarWatchlist`, `estaNaWatchlist`.
- Produces: `<BotaoWatchlist filme={{ id, titulo, poster }} />`; rota `/minha-lista`.

Os dois são Client Components: `localStorage` não existe no servidor. A leitura acontece dentro de `useEffect` para o HTML do servidor e o do cliente baterem na hidratação.

- [ ] **Step 1: Escrever os testes**

`src/components/filme/BotaoWatchlist.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { BotaoWatchlist } from '@/components/filme/BotaoWatchlist'
import { lerWatchlist } from '@/lib/preferencias'

const filme = { id: 27205, titulo: 'A Origem', poster: null }

describe('BotaoWatchlist', () => {
  beforeEach(() => localStorage.clear())

  it('salva o filme e troca o rótulo', async () => {
    render(<BotaoWatchlist filme={filme} />)

    await userEvent.click(screen.getByRole('button', { name: /salvar na minha lista/i }))

    expect(lerWatchlist()).toEqual([filme])
    expect(screen.getByRole('button', { name: /remover da minha lista/i })).toBeInTheDocument()
  })

  it('remove quando já está salvo', async () => {
    render(<BotaoWatchlist filme={filme} />)

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await userEvent.click(screen.getByRole('button', { name: /remover/i }))

    expect(lerWatchlist()).toEqual([])
  })

  it('reconhece um filme já salvo antes de renderizar', async () => {
    localStorage.setItem('watchlist', JSON.stringify([filme]))
    render(<BotaoWatchlist filme={filme} />)

    expect(await screen.findByRole('button', { name: /remover/i })).toBeInTheDocument()
  })
})
```

`src/app/minha-lista/pagina.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import MinhaLista from '@/app/minha-lista/page'

describe('MinhaLista', () => {
  beforeEach(() => localStorage.clear())

  it('explica o vazio para quem ainda não salvou nada', async () => {
    render(<MinhaLista />)
    expect(await screen.findByText(/ainda não salvou/i)).toBeInTheDocument()
  })

  it('lista os filmes salvos com link para o detalhe', async () => {
    localStorage.setItem(
      'watchlist',
      JSON.stringify([{ id: 27205, titulo: 'A Origem', poster: null }]),
    )

    render(<MinhaLista />)

    expect(await screen.findByRole('link', { name: /A Origem/ })).toHaveAttribute(
      'href',
      '/filme/27205',
    )
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/filme/BotaoWatchlist.test.tsx src/app/minha-lista`
Expected: FAIL — os módulos não existem.

- [ ] **Step 3: Implementar o botão**

`src/components/filme/BotaoWatchlist.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { alternarWatchlist, estaNaWatchlist } from '@/lib/preferencias'
import type { ItemWatchlist } from '@/lib/tipos'

export function BotaoWatchlist({ filme }: { filme: ItemWatchlist }) {
  const [salvo, setSalvo] = useState(false)

  // Ler no efeito: no servidor não há localStorage, e divergir aqui quebra a hidratação.
  useEffect(() => setSalvo(estaNaWatchlist(filme.id)), [filme.id])

  const alternar = () => {
    alternarWatchlist(filme)
    setSalvo((atual) => !atual)
  }

  return (
    <button type="button" onClick={alternar} aria-pressed={salvo}>
      {salvo ? 'Remover da minha lista' : 'Salvar na minha lista'}
    </button>
  )
}
```

- [ ] **Step 4: Implementar a página**

`src/app/minha-lista/page.tsx`:

```tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { lerWatchlist } from '@/lib/preferencias'
import type { ItemWatchlist } from '@/lib/tipos'

export default function MinhaLista() {
  const [itens, setItens] = useState<ItemWatchlist[] | null>(null)

  useEffect(() => setItens(lerWatchlist()), [])

  if (itens === null) return <main aria-busy="true" />

  return (
    <main>
      <h1>Minha lista</h1>
      {itens.length === 0 ? (
        <p>Você ainda não salvou nenhum filme.</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <li key={item.id}>
              <Link href={`/filme/${item.id}`}>
                {item.poster && <Image src={item.poster} alt="" width={342} height={513} />}
                {item.titulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Colocar o botão na página de detalhe**

Em `src/app/filme/[id]/page.tsx`, acrescente o import e o botão logo abaixo do `<h1>`:

```tsx
import { BotaoWatchlist } from '@/components/filme/BotaoWatchlist'

// ...dentro do JSX, depois do <h1>:
<BotaoWatchlist filme={{ id: filme.id, titulo: filme.titulo, poster: filme.poster }} />
```

- [ ] **Step 6: Rodar tudo e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS — 5 novos testes.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: watchlist local com botão no detalhe e página própria"
```

---

### Task 16: TMDB falso, teste de fumaça e CI

**Files:**
- Create: `test/mock-tmdb/servidor.mjs`, `playwright.config.ts`, `e2e/fluxo.spec.ts`, `.github/workflows/ci.yml`
- Test: `e2e/fluxo.spec.ts`

**Interfaces:**
- Consumes: `TMDB_BASE_URL` e `E2E` (já suportados pelo cliente e pelo `next.config.ts`).
- Produces: `npm run test:e2e` roda o app inteiro contra uma API falsa, sem chave e sem rede.

Por que uma API falsa em vez da real: o teste fica determinístico (o sorteio sempre encontra filme), o CI não precisa de segredo, e ninguém gasta cota do TMDB a cada push.

- [ ] **Step 1: Escrever o TMDB falso**

`test/mock-tmdb/servidor.mjs`:

```js
import { createServer } from 'node:http'

const PORTA = Number(process.env.PORTA_MOCK ?? 4010)

const filmes = Array.from({ length: 20 }, (_, i) => ({
  id: 100 + i,
  title: `Filme de Teste ${i + 1}`,
  original_title: `Test Movie ${i + 1}`,
  overview: `Sinopse do filme de teste número ${i + 1}.`,
  poster_path: null,
  backdrop_path: null,
  vote_average: 7 + (i % 3) / 10,
  vote_count: 500 + i,
  release_date: `20${10 + (i % 10)}-05-01`,
}))

const provedores = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
  { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 2 },
]

const generos = [
  { id: 35, name: 'Comédia' },
  { id: 28, name: 'Ação' },
]

const json = (resposta, corpo) => {
  resposta.writeHead(200, { 'content-type': 'application/json' })
  resposta.end(JSON.stringify(corpo))
}

const lista = { page: 1, results: filmes, total_pages: 2, total_results: 40 }

createServer((requisicao, resposta) => {
  const url = new URL(requisicao.url, `http://127.0.0.1:${PORTA}`)
  const caminho = url.pathname

  if (caminho === '/discover/movie' || caminho === '/search/movie') return json(resposta, lista)
  if (caminho === '/watch/providers/movie') return json(resposta, { results: provedores })
  if (caminho === '/genre/movie/list') return json(resposta, { genres: generos })

  const detalhe = caminho.match(/^\/movie\/(\d+)$/)
  if (detalhe) {
    const filme = filmes.find((f) => f.id === Number(detalhe[1])) ?? filmes[0]
    return json(resposta, {
      ...filme,
      runtime: 120,
      genres: generos,
      credits: { cast: [{ id: 1, name: 'Atriz de Teste', character: 'Protagonista', profile_path: null }] },
      videos: { results: [] },
    })
  }

  if (/^\/movie\/\d+\/watch\/providers$/.test(caminho)) {
    return json(resposta, {
      results: {
        BR: { link: 'https://www.justwatch.com/br/filme/teste', flatrate: [provedores[0]] },
      },
    })
  }

  resposta.writeHead(404, { 'content-type': 'application/json' })
  resposta.end(JSON.stringify({ status_message: 'não encontrado no mock' }))
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`TMDB falso ouvindo em http://127.0.0.1:${PORTA}`)
})
```

- [ ] **Step 2: Configurar o Playwright**

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'on-first-retry' },
  webServer: [
    {
      command: 'node test/mock-tmdb/servidor.mjs',
      url: 'http://127.0.0.1:4010/genre/movie/list',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run start',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        TMDB_READ_TOKEN: 'token-de-teste',
        TMDB_BASE_URL: 'http://127.0.0.1:4010',
        E2E: '1',
      },
    },
  ],
})
```

- [ ] **Step 3: Escrever o teste de fumaça**

`e2e/fluxo.spec.ts` — um teste só, percorrendo o caminho que a spec define como central.

```ts
import { expect, test } from '@playwright/test'

test('escolher serviços, filtrar, sortear, abrir detalhe e salvar na lista', async ({ page }) => {
  await page.goto('/')

  // Primeira visita: seleção de serviços.
  await expect(page.getByRole('heading', { name: /quais serviços você assina/i })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Netflix' }).check()
  await page.getByRole('button', { name: /ver filmes/i }).click()

  // Grade filtrada.
  await expect(page.getByRole('link', { name: /Filme de Teste 1/ })).toBeVisible()

  // Filtrar por gênero reescreve a URL.
  await page.getByRole('checkbox', { name: 'Comédia' }).check()
  await expect(page).toHaveURL(/generos=35/)

  // Sorteio.
  await page.getByRole('button', { name: /surpreenda-me/i }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole('link', { name: /ver detalhes/i }).click()

  // Detalhe com onde assistir.
  await expect(page.getByRole('heading', { name: /onde assistir/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Na assinatura' })).toBeVisible()

  // Salvar na lista e conferir.
  await page.getByRole('button', { name: /salvar na minha lista/i }).click()
  await page.getByRole('link', { name: /minha lista/i }).click()
  await expect(page.getByRole('link', { name: /Filme de Teste/ })).toBeVisible()
})

test('o rodapé traz as atribuições obrigatórias em toda página', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/fornecidos por JustWatch/i)).toBeVisible()
  await expect(page.getByText(/não é endossado, certificado ou aprovado pelo TMDB/i)).toBeVisible()
})
```

- [ ] **Step 4: Rodar o end-to-end**

Run: `npx playwright install --with-deps chromium && npm run test:e2e`
Expected: PASS — 2 testes. Se o build reclamar de `TMDB_READ_TOKEN`, confirme que o `env` do segundo `webServer` está sendo aplicado.

- [ ] **Step 5: Configurar o CI**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

O CI não precisa de nenhum segredo: o end-to-end roda contra o TMDB falso.

- [ ] **Step 6: Rodar a verificação completa**

Run: `npm run lint && npm run typecheck && npm run test && npm run test:e2e`
Expected: os quatro passam.

- [ ] **Step 7: Commit**

```bash
git add test e2e playwright.config.ts .github
git commit -m "test: fumaça ponta a ponta contra um TMDB falso e CI no GitHub Actions"
```

---

### Task 17: README, logo e fechamento

**Files:**
- Create: `README.md`
- Modify: `public/tmdb.svg` (passo manual do humano), `.env.example` (conferir)

**Interfaces:**
- Consumes: tudo o que já existe.
- Produces: projeto clonável e publicável por outra pessoa.

- [ ] **Step 1: Salvar o logo do TMDB**

Passo manual: baixar o logo em <https://www.themoviedb.org/about/logos-attribution> e salvar como `public/tmdb.svg`. É exigência dos termos de uso da API, e o teste do rodapé já cobra o `alt="TMDB"`.

- [ ] **Step 2: Escrever o README**

`README.md`:

````markdown
# O que assistir hoje

Catálogo de filmes disponíveis nos serviços de streaming que você assina no Brasil,
com filtros e um botão que sorteia um filme entre **todos** os resultados — não só
entre os visíveis na tela.

## Como rodar

1. Crie uma conta no TMDB e peça acesso à API em
   <https://www.themoviedb.org/settings/api>. Copie o **API Read Access Token**.
2. `cp .env.example .env.local` e preencha `TMDB_READ_TOKEN`.
3. `npm install`
4. `npm run dev` e abra <http://localhost:3000>.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run test` | Testes unitários e de componente (Vitest) |
| `npm run test:e2e` | Teste de fumaça ponta a ponta (Playwright, contra um TMDB falso) |
| `npm run typecheck` | TypeScript sem emitir |
| `npm run lint` | ESLint |

## Decisões de arquitetura

- **A chave do TMDB nunca chega ao navegador.** Todas as chamadas saem de Server
  Components ou de Route Handlers, e `src/lib/tmdb` importa `server-only` — se
  alguém tentar importá-lo de um Client Component, o build falha.
- **Os filtros vivem na URL.** Não há estado de filtro duplicado em React: o botão
  voltar funciona e qualquer combinação de filtros é um link compartilhável.
- **Sem backend.** Os serviços assinados ficam num cookie (para o servidor
  enxergá-los na primeira renderização, sem piscar) e a watchlist no
  `localStorage`.
- **O sorteio percorre todas as páginas.** Sortear entre os 20 filmes visíveis
  devolveria sempre os mesmos populares.

## Atribuição

Dados de disponibilidade em streaming fornecidos por **JustWatch**.

Este produto usa a API do TMDB, mas não é endossado, certificado ou aprovado pelo
TMDB.
````

- [ ] **Step 3: Conferir o `.env.example`**

Deve conter `TMDB_READ_TOKEN=` e `TMDB_BASE_URL=https://api.themoviedb.org/3` com o comentário explicando que a segunda só serve para testes.

- [ ] **Step 4: Verificação final**

Run: `npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build`
Expected: os cinco passam. Confira também, com `npm run dev`, que a primeira visita mostra a seleção de serviços e que o rodapé traz as duas atribuições.

- [ ] **Step 5: Commit**

```bash
git add README.md public .env.example
git commit -m "docs: README com passo a passo, decisões e atribuição"
```

- [ ] **Step 6: Publicar na Vercel**

Passo manual: importar o repositório na Vercel e cadastrar `TMDB_READ_TOKEN` nas
variáveis de ambiente do projeto. Não cadastre `TMDB_BASE_URL` — a ausência dela
faz o cliente usar a API real.

---

## Cobertura da spec

| Requisito da spec | Tarefa |
|---|---|
| Região BR, idioma pt-BR, flatrate, piso de votos, teto de 500 páginas | 1, 2 |
| Chave só no servidor, garantida em tempo de build | 4 |
| Cache com as janelas definidas | 1, 5 |
| Nova tentativa em 429 | 4 |
| Tipos de domínio isolando o formato do TMDB | 2, 5 |
| Queda de idioma na sinopse | 5 |
| Cookie de serviços + watchlist no localStorage | 6, 15 |
| Rodapé com atribuição a JustWatch e TMDB | 7, 17 |
| Primeira visita com seleção de serviços | 9 |
| Home com filtros na URL e grade | 7, 8 |
| Carregar mais respeitando o teto | 10 |
| Surpreenda-me entre todos os resultados | 3, 11 |
| Estado vazio sugerindo o filtro a afrouxar | 12 |
| Detalhe com elenco, trailer e onde assistir | 13 |
| Grupos vazios omitidos; ausência declarada | 13 |
| Busca por título sem filtro de serviço | 14 |
| Watchlist com id, título e pôster | 6, 15 |
| Erros: 429, 5xx, id inválido, parâmetro inválido | 4, 7, 10, 13 |
| Testes unitários, de componente, end-to-end e CI | 2–16 |
| README e configuração de segredos | 17 |
