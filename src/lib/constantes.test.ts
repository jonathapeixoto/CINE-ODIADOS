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
