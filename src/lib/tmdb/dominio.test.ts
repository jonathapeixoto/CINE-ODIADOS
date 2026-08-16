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
      backdrop: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
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

    expect(url?.searchParams.get('with_watch_providers')).toBe('8|1796|119|2100')
    expect(url?.searchParams.get('with_watch_monetization_types')).toBe('flatrate|free|ads')
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
