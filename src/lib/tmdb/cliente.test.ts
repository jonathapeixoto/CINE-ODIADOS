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
