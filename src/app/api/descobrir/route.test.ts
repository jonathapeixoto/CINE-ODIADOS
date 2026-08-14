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
