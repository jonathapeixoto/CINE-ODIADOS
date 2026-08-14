import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FILTROS_PADRAO } from '@/lib/filtros'
import { sugerirAfrouxamento } from '@/lib/tmdb/sugestoes'

const { estado } = vi.hoisted(() => ({ estado: { descobrir: vi.fn() } }))
vi.mock('@/lib/tmdb', () => ({ descobrirFilmes: estado.descobrir }))

const comResultados = (total: number) => ({ filmes: [], totalPaginas: 1, totalResultados: total })

describe('sugerirAfrouxamento', () => {
  beforeEach(() => {
    estado.descobrir.mockReset()
  })

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
