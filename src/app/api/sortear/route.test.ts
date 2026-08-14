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
  // Corpo em bloco (sem "return" implícito) de propósito: `mockReset()`
  // devolve o próprio mock encadeável, e se o callback do beforeEach
  // devolvesse essa função o Vitest a trataria como teardown implícito
  // (comportamento documentado) e a chamaria de novo depois de cada teste —
  // no teste de erro 500, o mock já estaria configurado para rejeitar
  // nesse momento, criando uma promise rejeitada nunca tratada e derrubando
  // o teste com um "boom" que nada tem a ver com a rota.
  beforeEach(() => {
    estado.descobrir.mockReset()
  })

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
