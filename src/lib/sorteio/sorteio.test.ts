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
