import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import MinhaLista from '@/app/minha-lista/page'

describe('MinhaLista', () => {
  beforeEach(() => localStorage.clear())

  it('explica o vazio para quem ainda não salvou nada', async () => {
    render(<MinhaLista />)
    expect(await screen.findByText(/ainda não salvou/i)).toBeInTheDocument()
  })

  it('lista os filmes salvos com link para o detalhe', async () => {
    localStorage.setItem(
      'watchlist',
      JSON.stringify([{ id: 27205, titulo: 'A Origem', poster: null }]),
    )

    render(<MinhaLista />)

    expect(await screen.findByRole('link', { name: /A Origem/ })).toHaveAttribute(
      'href',
      '/filme/27205',
    )
  })
})
