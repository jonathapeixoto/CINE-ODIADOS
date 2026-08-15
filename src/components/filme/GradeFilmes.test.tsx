import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GradeFilmes } from '@/components/filme/GradeFilmes'
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
  it('prioriza os primeiros 6 cartões quando priorizarPrimeiros=true', () => {
    const filmes = Array.from({ length: 10 }, (_, i) => criarFilme(i + 1, `Filme ${i + 1}`))
    render(<GradeFilmes filmes={filmes} priorizarPrimeiros />)

    // Verifica que os primeiros 6 têm data-priority=true
    for (let i = 0; i < 6; i++) {
      const img = screen.getByAltText(`Filme ${i + 1}`)
      expect(img).toHaveAttribute('data-priority', 'true')
    }

    // Verifica que o 7º tem data-priority=false
    const img7 = screen.getByAltText('Filme 7')
    expect(img7).toHaveAttribute('data-priority', 'false')

    // Verifica que outros também têm data-priority=false
    const img10 = screen.getByAltText('Filme 10')
    expect(img10).toHaveAttribute('data-priority', 'false')
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
