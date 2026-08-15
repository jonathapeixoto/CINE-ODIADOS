import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardFilme } from '@/components/filme/CardFilme'
import type { Filme } from '@/lib/tipos'

const filme: Filme = {
  id: 27205,
  titulo: 'A Origem',
  sinopse: 'Um ladrão que invade sonhos.',
  poster: 'https://image.tmdb.org/t/p/w342/poster.jpg',
  backdrop: null,
  nota: 8.37,
  votos: 35000,
  ano: 2010,
}

describe('CardFilme', () => {
  it('leva para a página de detalhe', () => {
    render(<CardFilme filme={filme} />)
    expect(screen.getByRole('link', { name: /A Origem/ })).toHaveAttribute('href', '/filme/27205')
  })

  it('mostra ano e nota com uma casa decimal', () => {
    render(<CardFilme filme={filme} />)
    expect(screen.getByText('2010')).toBeInTheDocument()
    expect(screen.getByText('8.4')).toBeInTheDocument()
  })

  it('usa o título como texto alternativo do pôster', () => {
    render(<CardFilme filme={filme} />)
    expect(screen.getByAltText('A Origem')).toBeInTheDocument()
  })

  it('mostra um espaço reservado quando não há pôster', () => {
    render(<CardFilme filme={{ ...filme, poster: null }} />)
    expect(screen.queryByAltText('A Origem')).not.toBeInTheDocument()
    expect(screen.getByText('Sem pôster')).toBeInTheDocument()
  })

  it('omite o ano quando não se sabe a data de lançamento', () => {
    render(<CardFilme filme={{ ...filme, ano: null }} />)
    expect(screen.queryByText('2010')).not.toBeInTheDocument()
  })

  it('marca o pôster como prioridade quando prioridade=true', () => {
    render(<CardFilme filme={filme} prioridade />)
    const img = screen.getByAltText('A Origem')
    expect(img).toHaveAttribute('data-priority', 'true')
  })

  it('não marca o pôster como prioridade por padrão', () => {
    render(<CardFilme filme={filme} />)
    const img = screen.getByAltText('A Origem')
    expect(img).toHaveAttribute('data-priority', 'false')
  })
})
