import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { BotaoWatchlist } from '@/components/filme/BotaoWatchlist'
import { lerWatchlist } from '@/lib/preferencias'

const filme = { id: 27205, titulo: 'A Origem', poster: null }

describe('BotaoWatchlist', () => {
  beforeEach(() => localStorage.clear())

  it('salva o filme e troca o rótulo', async () => {
    render(<BotaoWatchlist filme={filme} />)

    await userEvent.click(screen.getByRole('button', { name: /salvar na minha lista/i }))

    expect(lerWatchlist()).toEqual([filme])
    expect(screen.getByRole('button', { name: /remover da minha lista/i })).toBeInTheDocument()
  })

  it('remove quando já está salvo', async () => {
    render(<BotaoWatchlist filme={filme} />)

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await userEvent.click(screen.getByRole('button', { name: /remover/i }))

    expect(lerWatchlist()).toEqual([])
  })

  it('reconhece um filme já salvo antes de renderizar', async () => {
    localStorage.setItem('watchlist', JSON.stringify([filme]))
    render(<BotaoWatchlist filme={filme} />)

    expect(await screen.findByRole('button', { name: /remover/i })).toBeInTheDocument()
  })
})
