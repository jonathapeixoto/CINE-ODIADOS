# Curadoria brasileira — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir os serviços do site aos treze mais populares do Brasil, esconder da descoberta o filme que não está disponível em lugar nenhum, e fazer filmes em português subirem dentro de cada página de resultados.

**Architecture:** Um módulo novo de dados (`src/lib/servicos/populares.ts`) vira a única fonte de verdade sobre quais serviços existem; `listarProvedores` e `lerFiltros` passam a se submeter a ele. O portão de disponibilidade é uma mudança em `paraQueryTmdb`, que passa a sempre enviar `watch_region` e `with_watch_monetization_types`. A priorização em português é uma função pura de pontuação sobre o filme cru, aplicada só em `descobrirFilmes`. Nada disso muda a arquitetura de camadas do app — e um módulo (`provedores-visiveis.ts`) deixa de fazer sentido e é apagado.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind 4, Vitest + Testing Library + MSW, Playwright.

**Spec:** [`docs/superpowers/specs/2026-08-16-curadoria-brasil-design.md`](../specs/2026-08-16-curadoria-brasil-design.md)

## Global Constraints

- **Idioma do código:** identificadores, comentários e mensagens em **português**, como todo o resto do repositório. Comentários explicam *por que*, não *o quê*.
- **Região e idioma da API:** `REGIAO = 'BR'`, `IDIOMA = 'pt-BR'`, ambos já em `src/lib/constantes.ts`. Não redeclarar.
- **`server-only`:** só `src/lib/tmdb/cliente.ts`, `src/lib/tmdb/index.ts` e `src/lib/preferencias/servicos-servidor.ts` são server-only. `src/lib/servicos/populares.ts` **não** pode importar `server-only`: `lerFiltros` e componentes cliente vão importá-lo.
- **TDD:** teste que falha primeiro, sempre. Cada tarefa termina em commit.
- **Verificação por tarefa:** `npm run test` e `npm run typecheck` passam antes de commitar. Nas tarefas 6 e 7, também `npm run test:e2e`.
- **Nenhum selo de "dublado" ou "legendado" na interface.** O TMDB não tem esse dado; a pontuação em português é ordenação interna e nunca vira texto na tela.
- **IDs do TMDB conferidos em 2026-08-16** contra `/watch/providers/movie?watch_region=BR`. Copiar exatamente como estão na Tarefa 1.

### Desvio consciente em relação ao spec

O spec (§4.3) manda higienizar os IDs fora do allowlist em `lerServicosDoCookie`. Este plano faz isso em **`lerFiltros`** (Tarefa 4). Motivo: `lerServicosDoCookie` é sempre consumido por `lerFiltros` (`src/app/page.tsx`, `src/app/api/descobrir/route.ts`, `src/app/api/sortear/route.ts`), e `lerFiltros` também recebe IDs vindos da URL — que a higienização no cookie não alcançaria. Um lugar em vez de dois, cobrindo mais casos. O requisito do spec é atendido integralmente.

---

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/servicos/populares.ts` | O allowlist curado e as consultas sobre ele. Dados puros, sem I/O. |
| `src/lib/servicos/populares.test.ts` | Integridade do roster e comportamento das consultas. |
| `src/lib/tmdb/portugues.ts` | Pontuação e ordenação por sinais de português sobre o filme cru. |
| `src/lib/tmdb/portugues.test.ts` | Pontuação de cada sinal, ordem decrescente, estabilidade. |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `src/lib/tmdb/index.ts` | `listarProvedores` cruza com o allowlist; `descobrirFilmes` aplica o desempate |
| `src/lib/tmdb/tipos-crus.ts` | `FilmeCru` ganha `original_language` |
| `src/lib/filtros/query.ts` | Portão de disponibilidade sempre presente; apelidos no filtro de provedor |
| `src/lib/filtros/ler.ts` | Descarta serviço fora do allowlist |
| `src/components/filtros/BarraFiltros.tsx` | Sem truncagem, sem botão "mais serviços" |
| `src/components/filtros/SelecaoServicos.tsx` | Sem truncagem, sem botão "ver mais" |
| `src/app/page.tsx` | Corrige o comentário do destaque |
| `test/mock-tmdb/servidor.mjs` | Provedor fora do allowlist e sinais de português nos filmes |
| `e2e/fluxo.spec.ts` | Prova que o provedor de nicho não aparece |
| `README.md`, spec de 13/08 | Documentação |

**Apagar:** `src/components/filtros/provedores-visiveis.ts`

---

## Task 1: O allowlist curado

**Files:**
- Create: `src/lib/servicos/populares.ts`
- Test: `src/lib/servicos/populares.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type ServicoCurado = { rotulo: string; principal: number; apelidos: number[] }`
  - `const SERVICOS_POPULARES: ServicoCurado[]`
  - `ehServicoCurado(id: number): boolean`
  - `filtrarCurados(ids: number[]): number[]`
  - `idsParaFiltro(principais: number[]): number[]`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/servicos/populares.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  SERVICOS_POPULARES,
  ehServicoCurado,
  filtrarCurados,
  idsParaFiltro,
} from '@/lib/servicos/populares'

describe('SERVICOS_POPULARES', () => {
  it('tem os serviços de peso do Brasil', () => {
    expect(SERVICOS_POPULARES.map((s) => s.rotulo)).toEqual([
      'Netflix',
      'Prime Video',
      'Max',
      'Disney+',
      'Globoplay',
      'Apple TV+',
      'Paramount+',
      'Telecine',
      'Crunchyroll',
      'Claro tv+',
      'Looke',
      'Pluto TV',
      'MUBI',
    ])
  })

  it('nunca repete um id entre serviços', () => {
    // Um id em duas entradas faria dois serviços diferentes acenderem juntos na
    // barra, e idsParaFiltro mandaria o mesmo provedor duas vezes ao TMDB.
    const todos = SERVICOS_POPULARES.flatMap((s) => [s.principal, ...s.apelidos])
    expect(new Set(todos).size).toBe(todos.length)
  })
})

describe('ehServicoCurado', () => {
  it('reconhece um principal do roster', () => {
    expect(ehServicoCurado(8)).toBe(true)
  })

  it('recusa provedor de nicho', () => {
    expect(ehServicoCurado(692)).toBe(false)
  })

  it('recusa apelido: apelido não é serviço marcável', () => {
    // 1796 é a entrada "Netflix Standard with Ads". Ela entra no filtro junto
    // com a Netflix, mas não tem caixa própria na barra.
    expect(ehServicoCurado(1796)).toBe(false)
  })
})

describe('filtrarCurados', () => {
  it('descarta o que está fora do roster e preserva a ordem', () => {
    expect(filtrarCurados([692, 8, 1796, 337])).toEqual([8, 337])
  })

  it('devolve lista vazia sem reclamar', () => {
    expect(filtrarCurados([])).toEqual([])
  })
})

describe('idsParaFiltro', () => {
  it('expande cada serviço nos seus apelidos', () => {
    expect(idsParaFiltro([8, 119])).toEqual([8, 1796, 119, 2100])
  })

  it('segue a ordem do roster, não a da entrada', () => {
    // Determinismo: with_watch_providers é um OU, então a ordem não muda o
    // resultado da API, mas muda o que os testes precisam esperar.
    expect(idsParaFiltro([119, 8])).toEqual([8, 1796, 119, 2100])
  })

  it('ignora id que não é principal de nenhum serviço', () => {
    expect(idsParaFiltro([692, 1796])).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/lib/servicos/populares.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/servicos/populares"`

- [ ] **Step 3: Escrever a implementação**

Criar `src/lib/servicos/populares.ts`:

```ts
export type ServicoCurado = {
  /** O que aparece na tela. O nome do TMDB nem sempre serve: "HBO Max" virou
   *  Max, e "Telecine Amazon Channel" precisa aparecer como Telecine. */
  rotulo: string
  /** Id canônico: vai para a URL, identifica a entrada no cookie, e é dele que
   *  se pega o logo na resposta do TMDB. */
  principal: number
  /** Entradas irmãs do mesmo serviço no TMDB. Entram junto no filtro, senão
   *  marcar Max perderia todo filme catalogado só sob "HBO Max Amazon Channel". */
  apelidos: number[]
}

/**
 * A lista de serviços do site — curada, não calculada.
 *
 * O TMDB conhece 85 provedores de filme na região BR e os ordena por
 * `display_priority`, que não mede popularidade brasileira: nos quinze
 * primeiros aparecem FilmBox+, Sun Nxt, Eventive, Jolt Film e Cultpix, e o Max
 * fica na posição 28. Qualquer corte por top-N descartaria o Max e manteria o
 * Cultpix, e nenhum ajuste de N conserta isso.
 *
 * O custo é manutenção manual quando o mercado muda. É aceito: o mercado
 * brasileiro muda em escala de anos, e a lista tem treze linhas.
 *
 * Ids conferidos contra /watch/providers/movie?watch_region=BR em 2026-08-16.
 * Ausentes de propósito: Telecine avulso (227) e Star+ (619) não existem mais
 * na região BR; Apple TV Store (2), Google Play Filmes (3) e Amazon Video (10)
 * são lojas de aluguel, e a pergunta da barra é "quais serviços você assina".
 */
export const SERVICOS_POPULARES: ServicoCurado[] = [
  { rotulo: 'Netflix', principal: 8, apelidos: [1796] },
  { rotulo: 'Prime Video', principal: 119, apelidos: [2100] },
  { rotulo: 'Max', principal: 1899, apelidos: [1825] },
  { rotulo: 'Disney+', principal: 337, apelidos: [] },
  { rotulo: 'Globoplay', principal: 307, apelidos: [] },
  { rotulo: 'Apple TV+', principal: 350, apelidos: [] },
  { rotulo: 'Paramount+', principal: 531, apelidos: [2303, 582] },
  { rotulo: 'Telecine', principal: 2156, apelidos: [] },
  { rotulo: 'Crunchyroll', principal: 283, apelidos: [1968] },
  { rotulo: 'Claro tv+', principal: 484, apelidos: [167] },
  { rotulo: 'Looke', principal: 47, apelidos: [683] },
  { rotulo: 'Pluto TV', principal: 300, apelidos: [] },
  { rotulo: 'MUBI', principal: 11, apelidos: [201] },
]

const PRINCIPAIS = new Set(SERVICOS_POPULARES.map((servico) => servico.principal))

/** Apelido responde `false`: ele entra no filtro, mas não é serviço marcável. */
export const ehServicoCurado = (id: number): boolean => PRINCIPAIS.has(id)

export const filtrarCurados = (ids: number[]): number[] => ids.filter(ehServicoCurado)

/**
 * Traduz serviços marcados nos ids que o TMDB entende, apelidos incluídos.
 * A ordem é a do roster, para o resultado não depender da ordem do clique.
 */
export const idsParaFiltro = (principais: number[]): number[] =>
  SERVICOS_POPULARES.filter((servico) => principais.includes(servico.principal)).flatMap(
    (servico) => [servico.principal, ...servico.apelidos],
  )
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- src/lib/servicos/populares.test.ts`
Expected: PASS, 9 testes

- [ ] **Step 5: Commit**

```bash
git add src/lib/servicos/populares.ts src/lib/servicos/populares.test.ts
git commit -m "feat: curar a lista de serviços de streaming do Brasil"
```

---

## Task 2: `listarProvedores` obedece ao allowlist

**Files:**
- Modify: `src/lib/tmdb/index.ts:99-106` (a função `listarProvedores`) e a lista de imports em `src/lib/tmdb/index.ts:13-20`
- Test: `src/lib/tmdb/dominio.test.ts:242-276` (substituir dois testes, acrescentar um)

**Interfaces:**
- Consumes: `SERVICOS_POPULARES` da Tarefa 1; `urlImagem` de `./mapeadores`.
- Produces: `listarProvedores(): Promise<Provedor[]>` — mesma assinatura de antes, agora devolvendo só serviços curados, na ordem curada, com `nome` = `rotulo` e `prioridade` = índice no roster.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/lib/tmdb/dominio.test.ts`, substituir os dois primeiros testes do bloco `describe('listas e busca', ...)` — o de `listarProvedores` (linhas 243-262) e o do logo nulo (linhas 264-276) — por estes três:

```ts
  it('devolve só os serviços curados, na ordem curada e com o rótulo curado', async () => {
    let url: URL | undefined
    servidor.use(
      http.get(`${BASE}/watch/providers/movie`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          results: [
            { provider_id: 692, provider_name: 'Cultpix', logo_path: '/c.jpg', display_priority: 7 },
            { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/a.jpg', display_priority: 1 },
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 0 },
          ],
        })
      }),
    )

    const provedores = await listarProvedores()

    expect(url?.searchParams.get('watch_region')).toBe('BR')
    // Cultpix está fora do allowlist. E o rótulo curado vence o nome do TMDB:
    // "Amazon Prime Video" vira "Prime Video".
    expect(provedores.map((p) => p.id)).toEqual([8, 119])
    expect(provedores.map((p) => p.nome)).toEqual(['Netflix', 'Prime Video'])
    expect(provedores[0].logo).toBe('https://image.tmdb.org/t/p/w92/n.jpg')
  })

  it('omite o serviço curado que o TMDB não conhece mais', async () => {
    servidor.use(
      http.get(`${BASE}/watch/providers/movie`, () =>
        HttpResponse.json({
          results: [
            // 1825 é apelido do Max. Apelido sozinho não ressuscita o serviço:
            // sem o principal, não há logo nem id para pôr na URL.
            { provider_id: 1825, provider_name: 'HBO Max Amazon Channel', logo_path: '/h.jpg', display_priority: 11 },
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 0 },
          ],
        }),
      ),
    )

    expect((await listarProvedores()).map((p) => p.id)).toEqual([8])
  })

  it('deixa o logo nulo quando o serviço não tem imagem', async () => {
    servidor.use(
      http.get(`${BASE}/watch/providers/movie`, () =>
        HttpResponse.json({
          results: [
            { provider_id: 300, provider_name: 'Pluto TV', logo_path: null, display_priority: 19 },
          ],
        }),
      ),
    )

    expect((await listarProvedores())[0].logo).toBeNull()
  })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/lib/tmdb/dominio.test.ts -t "curados"`
Expected: FAIL — recebe `['Netflix', 'Amazon Prime Video']` e três provedores, porque nada filtra ainda

- [ ] **Step 3: Escrever a implementação**

Em `src/lib/tmdb/index.ts`, acrescentar `urlImagem` ao import de `./mapeadores` (linhas 13-20) e importar o roster logo abaixo do import de `@/lib/filtros`:

```ts
import { SERVICOS_POPULARES } from '@/lib/servicos/populares'
```

```ts
import {
  acharTrailer,
  mapearElenco,
  mapearFilme,
  mapearGenero,
  mapearProvedor,
  ordenarProvedores,
  urlImagem,
} from './mapeadores'
```

Substituir `listarProvedores` (linhas 99-106) por:

```ts
/**
 * Só os serviços curados, na ordem curada — ver src/lib/servicos/populares.ts
 * para por que a lista não vem do display_priority do TMDB.
 *
 * `obterDisponibilidade` continua mostrando os provedores reais do filme, sem
 * passar por aqui: na página de detalhe a pergunta é "onde este filme está?",
 * e omitir a loja de aluguel seria esconder a resposta.
 */
export async function listarProvedores(): Promise<Provedor[]> {
  const cru = await buscarTmdb<ListaProvedoresCrua>(
    '/watch/providers/movie',
    { watch_region: REGIAO },
    { revalidate: REVALIDATE.listas },
  )
  const porId = new Map(cru.results.map((provedor) => [provedor.provider_id, provedor]))

  return SERVICOS_POPULARES.flatMap((servico, indice) => {
    const achado = porId.get(servico.principal)
    // Serviço que saiu do catálogo do TMDB some da barra em silêncio — o site
    // continua de pé com um serviço a menos, que é a falha benigna.
    if (achado === undefined) return []

    return [
      {
        id: servico.principal,
        nome: servico.rotulo,
        logo: urlImagem(achado.logo_path, 'w92'),
        prioridade: indice,
      },
    ]
  })
}
```

Em `src/lib/tipos.ts`, ampliar o comentário do tipo `Provedor` (linha 23) para registrar a sobrecarga do campo:

```ts
/**
 * `logo: null` quando o TMDB não tem imagem do serviço; quem renderiza mostra o nome.
 * `prioridade` é ordem de exibição com duas origens: índice no roster curado
 * quando vem de `listarProvedores`, `display_priority` do TMDB quando vem da
 * disponibilidade de um filme. Ambas alimentam `ordenarProvedores`.
 */
export type Provedor = { id: number; nome: string; logo: string | null; prioridade: number }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- src/lib/tmdb/dominio.test.ts`
Expected: PASS (o teste de `obterDisponibilidade` continua verde — aquele caminho não passa pelo allowlist)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tmdb/index.ts src/lib/tmdb/dominio.test.ts src/lib/tipos.ts
git commit -m "feat: servir na barra só os serviços curados do Brasil"
```

---

## Task 3: O portão de disponibilidade

**Files:**
- Modify: `src/lib/filtros/query.ts:1-21`
- Test: `src/lib/filtros/filtros.test.ts:61-72` (substituir dois testes, acrescentar um) e `src/lib/tmdb/dominio.test.ts:81-96`

**Interfaces:**
- Consumes: `idsParaFiltro` da Tarefa 1.
- Produces: `paraQueryTmdb(filtros, hoje?)` — mesma assinatura, agora sempre emitindo `watch_region` e `with_watch_monetization_types`.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/lib/filtros/filtros.test.ts`, substituir os dois primeiros testes de `describe('paraQueryTmdb', ...)` (linhas 61-72) por:

```ts
  it('expande os apelidos do serviço marcado e cobra só o que já está pago', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, servicos: [8, 119] })
    expect(q.watch_region).toBe('BR')
    // 1796 e 2100 são as entradas "with Ads" dos mesmos dois serviços no TMDB.
    expect(q.with_watch_providers).toBe('8|1796|119|2100')
    // Quem marcou "eu assino Netflix" não quer ver que pode alugar por R$ 19,90.
    expect(q.with_watch_monetization_types).toBe('flatrate|free|ads')
  })

  it('mantém o portão de disponibilidade quando nenhum serviço foi escolhido', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO })
    expect(q.watch_region).toBe('BR')
    expect(q.with_watch_providers).toBeUndefined()
    expect(q.with_watch_monetization_types).toBe('flatrate|free|ads|rent|buy')
  })

  it('abre o portão quando só sobram serviços fora do allowlist', () => {
    // Rede de segurança: with_watch_providers vazio faria o TMDB devolver zero
    // resultado, e a home ficaria vazia sem explicação.
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, servicos: [692] })
    expect(q.with_watch_providers).toBeUndefined()
    expect(q.with_watch_monetization_types).toBe('flatrate|free|ads|rent|buy')
  })
```

Em `src/lib/tmdb/dominio.test.ts`, no teste `'repassa os filtros traduzidos para a API'` (linhas 92-93), trocar as duas expectativas:

```ts
    expect(url?.searchParams.get('with_watch_providers')).toBe('8|1796|119|2100')
    expect(url?.searchParams.get('with_watch_monetization_types')).toBe('flatrate|free|ads')
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/lib/filtros/filtros.test.ts`
Expected: FAIL — `with_watch_providers` vem `'8|119'` e `watch_region` vem `undefined` sem serviço marcado

- [ ] **Step 3: Escrever a implementação**

Substituir o topo de `src/lib/filtros/query.ts` (linhas 1-21) por:

```ts
import { MAX_PAGINAS, MIN_VOTOS, REGIAO } from '@/lib/constantes'
import { idsParaFiltro } from '@/lib/servicos/populares'
import type { Filtros, Ordenacao } from '@/lib/tipos'

const ORDEM_TMDB: Record<Ordenacao, string> = {
  popularidade: 'popularity.desc',
  nota: 'vote_average.desc',
  lancamento: 'primary_release_date.desc',
}

/** Sem serviço marcado a pergunta é "dá para assistir isto no Brasil de algum
 *  jeito?", e alugar conta. */
const MONETIZACAO_QUALQUER = 'flatrate|free|ads|rent|buy'
/** Com serviço marcado a pergunta virou "dá para assistir no que eu já pago?". */
const MONETIZACAO_ASSINADA = 'flatrate|free|ads'

export function paraQueryTmdb(filtros: Filtros, hoje: Date = new Date()): Record<string, string> {
  const query: Record<string, string> = {
    include_adult: 'false',
    page: String(Math.min(Math.max(filtros.pagina, 1), MAX_PAGINAS)),
    sort_by: ORDEM_TMDB[filtros.ordenacao],
  }

  // O portão de disponibilidade. with_watch_monetization_types vale com
  // watch_region sem exigir with_watch_providers, e é isso que permite dizer
  // "está em algum lugar no Brasil" sem enumerar provedor nenhum.
  const provedores = idsParaFiltro(filtros.servicos)
  query.watch_region = REGIAO
  if (provedores.length > 0) {
    query.with_watch_providers = provedores.join('|')
    query.with_watch_monetization_types = MONETIZACAO_ASSINADA
  } else {
    query.with_watch_monetization_types = MONETIZACAO_QUALQUER
  }
```

O resto da função (a partir de `if (filtros.generos.length > 0)`) fica como está.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- src/lib/filtros src/lib/tmdb`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/filtros/query.ts src/lib/filtros/filtros.test.ts src/lib/tmdb/dominio.test.ts
git commit -m "feat: esconder da descoberta o filme que não está em lugar nenhum"
```

---

## Task 4: Higienizar os serviços na leitura dos filtros

**Files:**
- Modify: `src/lib/filtros/ler.ts:39-54`
- Test: `src/lib/filtros/filtros.test.ts` (acrescentar ao bloco `describe('lerFiltros', ...)`)

**Interfaces:**
- Consumes: `filtrarCurados` da Tarefa 1.
- Produces: `lerFiltros(params, servicosPadrao)` — mesma assinatura; `.servicos` agora só contém principais do roster.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `src/lib/filtros/filtros.test.ts`, dentro de `describe('lerFiltros', ...)`, logo depois do teste `'descarta ids inválidos em vez de quebrar'`:

```ts
  it('descarta serviço que não está no allowlist curado', () => {
    // Vindo da URL e vindo do cookie: quem visitou o site antes da curadoria
    // tem serviço aposentado gravado, e ele não tem caixa na barra para ser
    // desligado — seria um filtro ativo e invisível.
    expect(lerFiltros({ servicos: '8,692' }, []).servicos).toEqual([8])
    expect(lerFiltros({}, [8, 692]).servicos).toEqual([8])
  })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/lib/filtros/filtros.test.ts -t "allowlist"`
Expected: FAIL — recebe `[8, 692]`

- [ ] **Step 3: Escrever a implementação**

Em `src/lib/filtros/ler.ts`, acrescentar o import depois do de `@/lib/tipos` (linha 2):

```ts
import { filtrarCurados } from '@/lib/servicos/populares'
```

E substituir o corpo de `lerFiltros` (linhas 39-54) por:

```ts
export function lerFiltros(params: ParamsBrutos, servicosPadrao: number[]): Filtros {
  const bruto = (chave: string) => primeiro(params[chave])
  const servicos = bruto('servicos')
  const escolhidos =
    servicos === undefined ? servicosPadrao : servicos === 'todos' ? [] : lerIds(servicos)

  return {
    // Único funil por onde URL e cookie viram Filtros, e por isso o único lugar
    // que precisa peneirar: um id fora do roster não tem caixa na barra, e
    // deixá-lo passar daria um filtro ativo que o usuário não consegue desligar.
    servicos: filtrarCurados(escolhidos),
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

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- src/lib/filtros/filtros.test.ts`
Expected: PASS (o teste de ida e volta URL→filtros→URL usa `servicos: [8]`, que é curado, e continua verde)

- [ ] **Step 5: Commit**

```bash
git add src/lib/filtros/ler.ts src/lib/filtros/filtros.test.ts
git commit -m "fix: descartar serviço que saiu da lista curada"
```

---

## Task 5: O desempate em português

**Files:**
- Create: `src/lib/tmdb/portugues.ts`
- Test: `src/lib/tmdb/portugues.test.ts`
- Modify: `src/lib/tmdb/tipos-crus.ts:1-11`, `src/lib/tmdb/index.ts:38-43`, `src/lib/tmdb/dominio.test.ts`

**Interfaces:**
- Consumes: `FilmeCru` de `./tipos-crus`.
- Produces: `pontuarPortugues(cru: FilmeCru): number`, `ordenarPorPortugues(crus: FilmeCru[]): FilmeCru[]`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/tmdb/portugues.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ordenarPorPortugues, pontuarPortugues } from '@/lib/tmdb/portugues'
import type { FilmeCru } from '@/lib/tmdb/tipos-crus'

const cru = (extra: Partial<FilmeCru>): FilmeCru => ({
  id: 1,
  title: 'Inception',
  original_title: 'Inception',
  overview: '',
  original_language: 'en',
  ...extra,
})

describe('pontuarPortugues', () => {
  it('não dá ponto ao filme sem sinal nenhum', () => {
    expect(pontuarPortugues(cru({}))).toBe(0)
  })

  it('dá dois pontos ao filme falado em português', () => {
    expect(pontuarPortugues(cru({ original_language: 'pt' }))).toBe(2)
  })

  it('dá um ponto ao título brasileiro', () => {
    expect(pontuarPortugues(cru({ title: 'A Origem' }))).toBe(1)
  })

  it('dá um ponto à sinopse traduzida', () => {
    expect(pontuarPortugues(cru({ overview: 'Um ladrão que invade sonhos.' }))).toBe(1)
  })

  it('soma os três sinais', () => {
    const nacional = cru({
      original_language: 'pt',
      title: 'Cidade de Deus',
      original_title: 'City of God',
      overview: 'Dois meninos crescem na favela.',
    })
    expect(pontuarPortugues(nacional)).toBe(4)
  })

  it('não confunde espaço em branco com tradução', () => {
    expect(pontuarPortugues(cru({ title: '   ', overview: '  ' }))).toBe(0)
  })
})

describe('ordenarPorPortugues', () => {
  it('põe quem tem mais sinal de português na frente', () => {
    const nenhum = cru({ id: 1 })
    const traduzido = cru({ id: 2, title: 'A Origem', overview: 'Sonhos.' })
    const nacional = cru({ id: 3, original_language: 'pt', overview: 'Dois meninos.' })

    expect(ordenarPorPortugues([nenhum, traduzido, nacional]).map((f) => f.id)).toEqual([3, 2, 1])
  })

  it('preserva a ordem do TMDB entre empatados', () => {
    // A ordenação que o usuário pediu — popularidade, nota ou lançamento —
    // continua mandando dentro de cada faixa. O desempate só desempata.
    const empatados = [cru({ id: 10 }), cru({ id: 11 }), cru({ id: 12 })]
    expect(ordenarPorPortugues(empatados).map((f) => f.id)).toEqual([10, 11, 12])
  })

  it('não modifica o array que recebeu', () => {
    const original = [cru({ id: 1 }), cru({ id: 2, original_language: 'pt' })]
    ordenarPorPortugues(original)
    expect(original.map((f) => f.id)).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/lib/tmdb/portugues.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/tmdb/portugues"`

- [ ] **Step 3: Escrever a implementação**

Em `src/lib/tmdb/tipos-crus.ts`, acrescentar o campo em `FilmeCru`, logo depois de `original_title`:

```ts
export type FilmeCru = {
  id: number
  title?: string
  original_title?: string
  original_language?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  release_date?: string
}
```

Criar `src/lib/tmdb/portugues.ts`:

```ts
import type { FilmeCru } from './tipos-crus'

const preenchido = (valor: string | undefined): string => valor?.trim() ?? ''

/**
 * O TMDB não tem campo de dublagem nem de legenda — não existe parâmetro de
 * idioma de áudio no /discover, e /translations fala de texto, não de faixa de
 * áudio. O que dá para medir é indireto, e por isso o resultado é desempate e
 * nunca filtro: se o sinal errar, o custo é uma posição na grade.
 *
 * Nada disso vira texto na tela. Escrever "Dublado" a partir daqui seria uma
 * promessa que o dado não sustenta.
 */
export function pontuarPortugues(cru: FilmeCru): number {
  const original = preenchido(cru.original_title)
  const traduzido = preenchido(cru.title)

  return (
    // Falado em português: não depende de dublagem nenhuma.
    (cru.original_language === 'pt' ? 2 : 0) +
    // Título brasileiro existe, logo houve lançamento comercial aqui.
    (traduzido !== '' && traduzido !== original ? 1 : 0) +
    // O TMDB devolve overview vazio quando não há tradução no idioma pedido.
    (preenchido(cru.overview) !== '' ? 1 : 0)
  )
}

/**
 * Decrescente por pontuação, estável no empate. A estabilidade é requisito, não
 * detalhe: dentro de uma faixa a ordem que o usuário pediu tem que sobreviver.
 * O índice entra na comparação em vez de confiar na estabilidade do `sort` do
 * runtime — a garantia fica no código, onde o teste consegue vê-la.
 */
export function ordenarPorPortugues(crus: FilmeCru[]): FilmeCru[] {
  return crus
    .map((cru, ordem) => ({ cru, ponto: pontuarPortugues(cru), ordem }))
    .sort((a, b) => b.ponto - a.ponto || a.ordem - b.ordem)
    .map((item) => item.cru)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- src/lib/tmdb/portugues.test.ts`
Expected: PASS, 9 testes

- [ ] **Step 5: Ligar o desempate na descoberta — teste primeiro**

Acrescentar em `src/lib/tmdb/dominio.test.ts`, ao fim do bloco `describe('descobrirFilmes', ...)`:

```ts
  it('põe os filmes em português na frente da página', async () => {
    servidor.use(
      http.get(`${BASE}/discover/movie`, () =>
        HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 2,
          results: [
            { ...filmeCru, id: 1, title: 'Inception', original_title: 'Inception', overview: '' },
            { ...filmeCru, id: 2, title: 'A Origem', original_title: 'Inception' },
          ],
        }),
      ),
    )

    expect((await descobrirFilmes(FILTROS_PADRAO)).filmes.map((f) => f.id)).toEqual([2, 1])
  })
```

E ao fim do bloco `describe('listas e busca', ...)`:

```ts
  it('não reordena os resultados da busca', async () => {
    servidor.use(
      http.get(`${BASE}/search/movie`, () =>
        HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 2,
          results: [
            { ...filmeCru, id: 1, title: 'Inception', original_title: 'Inception', overview: '' },
            { ...filmeCru, id: 2, title: 'A Origem', original_title: 'Inception' },
          ],
        }),
      ),
    )

    // Na busca a ordem é a relevância do termo digitado; mexer nela atrapalha
    // justamente quem está procurando um título específico.
    expect((await buscarPorTitulo('inception', 1)).filmes.map((f) => f.id)).toEqual([1, 2])
  })
```

Run: `npm run test -- src/lib/tmdb/dominio.test.ts -t "português"`
Expected: FAIL — recebe `[1, 2]`

- [ ] **Step 6: Ligar o desempate na descoberta — implementação**

Em `src/lib/tmdb/index.ts`, acrescentar o import de `./portugues` depois do de `./mapeadores`:

```ts
import { ordenarPorPortugues } from './portugues'
```

E substituir `descobrirFilmes` (linhas 38-43) por:

```ts
export async function descobrirFilmes(filtros: Filtros): Promise<PaginaDeFilmes> {
  const lista = await buscarTmdb<ListaCrua>('/discover/movie', paraQueryTmdb(filtros), {
    revalidate: REVALIDATE.descoberta,
  })

  // O desempate mora aqui e não em paraPagina, para buscarPorTitulo não o
  // herdar por acidente. É desempate local: reordena os 20 desta página, não
  // promove um filme da página 4 para a 1.
  return paraPagina({ ...lista, results: ordenarPorPortugues(lista.results) })
}
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npm run test -- src/lib/tmdb && npm run typecheck`
Expected: PASS nos dois

- [ ] **Step 8: Commit**

```bash
git add src/lib/tmdb/portugues.ts src/lib/tmdb/portugues.test.ts src/lib/tmdb/tipos-crus.ts src/lib/tmdb/index.ts src/lib/tmdb/dominio.test.ts
git commit -m "feat: pôr filme em português na frente da grade"
```

---

## Task 6: Apagar a truncagem de provedores

**Files:**
- Delete: `src/components/filtros/provedores-visiveis.ts`
- Modify: `src/components/filtros/BarraFiltros.tsx` (linhas 7, 128, 151-154, 220, 231-241)
- Modify: `src/components/filtros/SelecaoServicos.tsx` (linhas 7, 22, 24-27, 46, 78-90)
- Test: `src/components/filtros/BarraFiltros.test.tsx` (linhas 5, 189-221), `src/components/filtros/SelecaoServicos.test.tsx` (linhas 5, 48-66)

**Interfaces:**
- Consumes: nada novo. `provedoresVisiveis`, `SERVICOS_NA_BARRA` e `SERVICOS_NA_PRIMEIRA_VISITA` deixam de existir.
- Produces: nada.

- [ ] **Step 1: Trocar os testes de truncagem pelos de lista inteira**

Cada teste novo precisa de uma lista maior que o limite que ele aposenta,
senão ele passa antes da mudança e não prova nada — `SERVICOS_NA_BARRA` é 12 e
`SERVICOS_NA_PRIMEIRA_VISITA` é 20, e a lista de dois provedores dos testes
existentes nunca chegou a ser truncada.

Em `src/components/filtros/BarraFiltros.test.tsx`: apagar o import da linha 5 (`import { SERVICOS_NA_BARRA } ...`) e substituir o bloco das linhas 189-221 (o comentário sobre a centena de provedores, o `const muitos`, o teste `'mostra só a cabeça da lista de serviços...'` e o teste `'mantém à vista um serviço marcado...'`) por:

```ts
  it('mostra a lista inteira de serviços, sem gaveta', () => {
    // Treze é o tamanho do roster curado (src/lib/servicos/populares.ts) — e
    // era um a mais que o antigo limite de 12 da barra, então a curadoria
    // sozinha teria escondido um serviço de verdade atrás do "mais serviços".
    const roster = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1,
      nome: `Serviço ${i + 1}`,
      logo: null,
      prioridade: i,
    }))

    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={roster} generos={generos} />)

    expect(screen.getByRole('checkbox', { name: 'Serviço 1' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Serviço 13' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mais \d+ serviços/i })).not.toBeInTheDocument()
  })
```

Em `src/components/filtros/SelecaoServicos.test.tsx`: apagar o import da linha 5 e substituir o teste `'limita a primeira tela e revela o resto por um botão'` (linhas 48-66) por:

```ts
  it('mostra a lista inteira de serviços, sem gaveta', () => {
    // Vinte e cinco é de propósito maior que o roster real de treze: o que se
    // prova aqui é o contrato do componente — ele mostra a lista que recebe,
    // qualquer que seja o tamanho — e não o tamanho da lista curada.
    const muitos = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      nome: `Serviço ${i + 1}`,
      logo: null,
      prioridade: i,
    }))

    render(<SelecaoServicos provedores={muitos} />)

    expect(screen.getByRole('checkbox', { name: 'Serviço 1' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Serviço 25' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ver mais/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/components/filtros`
Expected: FAIL nos dois arquivos — a `BarraFiltros` ainda esconde o "Serviço 13" atrás de um botão "Mais 1 serviços", e a `SelecaoServicos` ainda esconde o "Serviço 25" atrás de "Ver mais 5 serviços"

- [ ] **Step 3: Limpar `BarraFiltros.tsx`**

1. Apagar a linha 7: `import { SERVICOS_NA_BARRA, provedoresVisiveis } from './provedores-visiveis'`
2. Apagar a linha 128: `const [todosOsServicos, setTodosOsServicos] = useState(false)`
3. Apagar as linhas 151-154 (`const servicosNaTela = ...` e `const escondidos = ...`)
4. Na linha 220, trocar `{servicosNaTela.map((provedor) => (` por `{provedores.map((provedor) => (`
5. Apagar o bloco das linhas 231-241 — todo o `{(todosOsServicos || escondidos > 0) && ( ... )}`

`IconeChevron` continua em uso pelo botão "Filtros"; **não** apagar. `useState` continua em uso por `aberto`.

- [ ] **Step 4: Limpar `SelecaoServicos.tsx`**

1. Apagar a linha 7: `import { SERVICOS_NA_PRIMEIRA_VISITA, provedoresVisiveis } from './provedores-visiveis'`
2. Apagar a linha 22: `const [todos, setTodos] = useState(false)`
3. Apagar as linhas 24-27 (`const naTela = ...` e `const escondidos = ...`)
4. Na linha 46, trocar `{naTela.map((provedor) => (` por `{provedores.map((provedor) => (`
5. Apagar as linhas 78-90 — o comentário sobre a parede de logos e todo o bloco `{(todos || escondidos > 0) && ( ... )}`

`useState` continua em uso por `escolhidos`.

- [ ] **Step 5: Apagar o módulo**

```bash
git rm src/components/filtros/provedores-visiveis.ts
```

- [ ] **Step 6: Rodar tudo e confirmar que passa**

Run: `npm run test && npm run typecheck && npm run lint`
Expected: PASS nos três. Se o typecheck reclamar de `useState` importado e não usado em algum dos dois componentes, remover o import correspondente.

- [ ] **Step 7: Commit**

```bash
git add src/components/filtros
git commit -m "refactor: aposentar a gaveta de serviços, que treze logos não pedem"
```

---

## Task 7: TMDB falso e teste de ponta a ponta

**Files:**
- Modify: `test/mock-tmdb/servidor.mjs:5-20`
- Modify: `e2e/fluxo.spec.ts:6-9`

**Interfaces:**
- Consumes: nada (o mock é um servidor HTTP independente).
- Produces: nada.

- [ ] **Step 1: Dar ao TMDB falso um provedor de nicho e sinais de português**

Em `test/mock-tmdb/servidor.mjs`, substituir os blocos `filmes` (linhas 5-15) e `provedores` (linhas 17-20) por:

```js
// Metade com sinal forte de português, metade sem: sem essa variação o
// desempate de src/lib/tmdb/portugues.ts não teria o que ordenar.
//
// O `title` continua "Filme de Teste N" em todos, de propósito. O sorteio pega
// um filme qualquer e o e2e depois procura /Filme de Teste/ na Minha Lista —
// variar o título faria esse teste falhar de vez em quando, conforme o sorteio.
// Quem varia é o idioma original e a sinopse.
const filmes = Array.from({ length: 20 }, (_, i) => {
  const emPortugues = i % 2 === 0
  return {
    id: 100 + i,
    title: `Filme de Teste ${i + 1}`,
    original_title: `Test Movie ${i + 1}`,
    original_language: emPortugues ? 'pt' : 'en',
    overview: emPortugues ? `Sinopse do filme de teste número ${i + 1}.` : '',
    poster_path: null,
    backdrop_path: null,
    vote_average: 7 + (i % 3) / 10,
    vote_count: 500 + i,
    release_date: `20${10 + (i % 10)}-05-01`,
  }
})

// Cultpix não está no allowlist curado: ele existe aqui justamente para o e2e
// provar que o site não o mostra.
const provedores = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
  { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 2 },
  { provider_id: 692, provider_name: 'Cultpix', logo_path: '/cultpix.jpg', display_priority: 3 },
]
```

O `flatrate: [provedores[0]]` na rota de disponibilidade (linha 71) continua correto — `provedores[0]` segue sendo a Netflix.

- [ ] **Step 2: Escrever a asserção que falha no e2e**

Em `e2e/fluxo.spec.ts`, no primeiro teste, substituir as linhas 6-9 por:

```ts
  // Primeira visita: seleção de serviços.
  await expect(page.getByRole('heading', { name: /quais serviços você assina/i })).toBeVisible()

  // Só os serviços curados aparecem. O TMDB falso também serve o Cultpix, que
  // está fora do allowlist brasileiro, e ele não pode ter caixa em tela alguma.
  await expect(page.getByRole('checkbox', { name: 'Cultpix' })).toHaveCount(0)
  // "Amazon Prime Video" aparece pelo rótulo curado, não pelo nome do TMDB.
  await expect(page.getByRole('checkbox', { name: 'Prime Video' })).toBeVisible()

  await page.getByRole('checkbox', { name: 'Netflix' }).check()
  await page.getByRole('button', { name: /ver filmes/i }).click()
```

E logo depois do clique que abre o painel de filtros (linha 18 do arquivo original, `await page.getByRole('button', { name: /filtros/i }).click()`), acrescentar:

```ts
  await expect(page.getByRole('checkbox', { name: 'Cultpix' })).toHaveCount(0)
```

- [ ] **Step 3: Rodar e confirmar que passa**

Run: `npm run test:e2e`
Expected: PASS. As tarefas 1-6 já entregaram o comportamento; este passo prova ponta a ponta que ele chega à tela.

Se o Playwright reclamar que os navegadores não estão instalados: `npx playwright install --with-deps chromium`.

- [ ] **Step 4: Commit**

```bash
git add test/mock-tmdb/servidor.mjs e2e/fluxo.spec.ts
git commit -m "test: provar ponta a ponta que serviço de nicho não chega à tela"
```

---

## Task 8: Comentários e documentação

**Files:**
- Modify: `src/app/page.tsx:25-29`
- Modify: `README.md` (bloco "Decisões de arquitetura" e bloco "Mais contexto")
- Modify: `docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md` (seções 5.2, 6.1, 6.2)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Corrigir o comentário do destaque**

Em `src/app/page.tsx`, substituir o comentário das linhas 25-28 por:

```tsx
  // O destaque é o primeiro resultado da página como o site a apresenta — o
  // primeiro depois do desempate por português (src/lib/tmdb/portugues.ts), não
  // a ordem crua do TMDB. Continua não sendo escolha editorial: troca quando um
  // filtro troca, e o olho-de-boi pode dizer por que aquele filme está ali. Sem
  // arte de fundo não há destaque: um herói sem imagem é só um título grande no
  // vazio.
```

Não há mudança de código nesta linha — só o comentário, que sem o conserto viraria mentira.

- [ ] **Step 2: Acrescentar a decisão ao README**

Em `README.md`, inserir um item novo na lista "Decisões de arquitetura", logo depois do item sobre os filtros na URL:

```markdown
- **A lista de serviços é curada, e a grade só mostra filme que dá para
  assistir.** `src/lib/servicos/populares.ts` fixa os treze serviços de peso no
  Brasil, porque o `display_priority` do TMDB não mede popularidade brasileira —
  ele põe o Max na posição 28, atrás de canais de nicho. Cada serviço carrega os
  ids irmãos do TMDB (a Netflix e a "Netflix Standard with Ads" são entradas
  diferentes), senão o filtro perderia catálogo. E toda consulta de descoberta
  leva `watch_region=BR` com `with_watch_monetization_types`, então filme sem
  distribuição nenhuma no Brasil não aparece na grade — a busca por título
  continua achando qualquer filme, que é o caminho para descobrir que um título
  não está em lugar nenhum.
- **Filme em português vem primeiro, sem promessa que não dá para cumprir.** O
  TMDB não tem dado de dublagem nem de legenda, então `src/lib/tmdb/portugues.ts`
  pontua sinais indiretos (idioma original, título brasileiro, sinopse
  traduzida) e usa isso só como desempate dentro da página. Nada some por causa
  do sinal, e nenhum selo de "dublado" aparece na tela.
```

- [ ] **Step 3: Apontar o README para os dois specs**

Substituir o bloco "Mais contexto" no fim do `README.md` por:

```markdown
## Mais contexto

A decisão de design completa — por que Next.js, por que cookie em vez de conta de
usuário, o que foi descartado e por quê — está em
[`docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md`](docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md).

A curadoria brasileira que veio depois — o allowlist de serviços, o portão de
disponibilidade e a priorização do português, com os ids do TMDB conferidos e o
que foi descartado — está em
[`docs/superpowers/specs/2026-08-16-curadoria-brasil-design.md`](docs/superpowers/specs/2026-08-16-curadoria-brasil-design.md).
```

- [ ] **Step 4: Marcar as seções superadas do spec antigo**

Em `docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md`, inserir esta linha logo abaixo de cada um dos três títulos `### 5.2 Regras de tradução dos filtros`, `### 6.1 Primeira visita` e `### 6.2 Home`:

```markdown
> **Superado em 2026-08-16** por
> [`2026-08-16-curadoria-brasil-design.md`](2026-08-16-curadoria-brasil-design.md):
> a lista de serviços passou a ser curada e o filtro de disponibilidade passou a
> valer sempre. O texto abaixo fica como registro do desenho original.
```

Não reescrever o conteúdo dessas seções: o spec antigo registra por que o app foi feito assim, e esse histórico tem valor.

- [ ] **Step 5: Verificação final**

Run: `npm run test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
Expected: PASS em todos. `npm run build` roda antes do typecheck no CI por decisão registrada no commit `425c35b`; aqui a ordem não importa, mas os cinco precisam passar.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx README.md docs/superpowers/specs/2026-08-13-catalogo-streaming-design.md
git commit -m "docs: registrar a curadoria brasileira no README e nos specs"
```

---

## Cobertura do spec

| Requisito do spec | Tarefa |
|---|---|
| §4.1 modelo `ServicoCurado` com rótulo, principal e apelidos | 1 |
| §4.2 roster de treze com os ids conferidos | 1 |
| §4.3 `listarProvedores` cruza com o allowlist, ordem e rótulo curados | 2 |
| §4.3 entrada ausente no TMDB não quebra | 2 |
| §4.3 sobrecarga de `prioridade` comentada no tipo | 2 |
| §4.3 `provedores-visiveis.ts` apagado, botões "ver mais" removidos | 6 |
| §4.3 id fora do allowlist descartado (via `lerFiltros`, ver desvio) | 4 |
| §5 portão sempre presente, monetização assimétrica | 3 |
| §5 apelidos no `with_watch_providers` | 3 |
| §5 busca e Minha Lista não herdam o portão | 3 (busca provada em 5), 7 |
| §6.1 `original_language` em `FilmeCru`, três sinais pontuados | 5 |
| §6.2 ordenação estável, só na descoberta, `Filme` sem campo novo | 5 |
| §6.3 nenhum selo na interface | comentário em 5; nenhuma tarefa acrescenta texto de tela |
| §7 comentário do destaque corrigido | 8 |
| §9 mock com provedor de nicho e sinais de português; e2e | 7 |
| §10 README e nota de remissão no spec antigo | 8 |
