import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GradeFilmes, QTD_PRIORITARIA } from '@/components/filme/GradeFilmes'
import type { Filme } from '@/lib/tipos'

const criarFilme = (id: number, titulo: string): Filme => ({
  id,
  titulo,
  sinopse: 'Sinopse',
  poster: `https://image.tmdb.org/t/p/w342/poster${id}.jpg`,
  backdrop: null,
  nota: 7.5,
  votos: 1000,
  ano: 2020,
})

describe('GradeFilmes', () => {
  // O número exato acompanha a maior contagem de colunas da grade, então o
  // teste lê a constante em vez de repeti-la: o que ele garante é a regra —
  // a primeira linha inteira entra prioritária, e nada além dela.
  it('prioriza a primeira linha de cartões quando priorizarPrimeiros=true', () => {
    const total = QTD_PRIORITARIA + 3
    const filmes = Array.from({ length: total }, (_, i) => criarFilme(i + 1, `Filme ${i + 1}`))
    render(<GradeFilmes filmes={filmes} priorizarPrimeiros />)

    for (let i = 0; i < QTD_PRIORITARIA; i++) {
      expect(screen.getByAltText(`Filme ${i + 1}`)).toHaveAttribute('data-priority', 'true')
    }

    // O primeiro cartão fora da linha, e o último de todos, ficam de fora.
    expect(screen.getByAltText(`Filme ${QTD_PRIORITARIA + 1}`)).toHaveAttribute(
      'data-priority',
      'false',
    )
    expect(screen.getByAltText(`Filme ${total}`)).toHaveAttribute('data-priority', 'false')
  })

  it('não prioriza nenhum cartão por padrão (priorizarPrimeiros=false)', () => {
    const filmes = Array.from({ length: 10 }, (_, i) => criarFilme(i + 1, `Filme ${i + 1}`))
    render(<GradeFilmes filmes={filmes} />)

    // Verifica que todos têm data-priority=false
    for (let i = 0; i < 10; i++) {
      const img = screen.getByAltText(`Filme ${i + 1}`)
      expect(img).toHaveAttribute('data-priority', 'false')
    }
  })

  it('não prioriza nenhum cartão quando priorizarPrimeiros=false explicitamente', () => {
    const filmes = Array.from({ length: 8 }, (_, i) => criarFilme(i + 1, `Filme ${i + 1}`))
    render(<GradeFilmes filmes={filmes} priorizarPrimeiros={false} />)

    // Verifica que todos têm data-priority=false (inclusive os que seriam prioritários)
    for (let i = 0; i < 8; i++) {
      const img = screen.getByAltText(`Filme ${i + 1}`)
      expect(img).toHaveAttribute('data-priority', 'false')
    }
  })
})
