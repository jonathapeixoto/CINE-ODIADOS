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
