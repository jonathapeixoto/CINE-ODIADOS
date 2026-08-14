import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotaoSurpreendaMe } from '@/components/filme/BotaoSurpreendaMe'
import { FILTROS_PADRAO } from '@/lib/filtros'

const filme = {
  id: 27205,
  titulo: 'A Origem',
  sinopse: 'Um ladrão que invade sonhos.',
  poster: null,
  backdrop: null,
  nota: 8.4,
  votos: 35000,
  ano: 2010,
}

const respostaCom = (corpo: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => corpo })

afterEach(() => vi.unstubAllGlobals())

describe('BotaoSurpreendaMe', () => {
  it('mostra o filme sorteado num diálogo', async () => {
    vi.stubGlobal('fetch', respostaCom({ filme }))

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('A Origem')
    expect(screen.getByRole('link', { name: /ver detalhes/i })).toHaveAttribute(
      'href',
      '/filme/27205',
    )
  })

  it('leva os filtros atuais para a rota de sorteio', async () => {
    const fetchFalso = respostaCom({ filme })
    vi.stubGlobal('fetch', fetchFalso)

    render(<BotaoSurpreendaMe filtros={{ ...FILTROS_PADRAO, servicos: [8], notaMinima: 7 }} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))
    await screen.findByRole('dialog')

    const url = new URL(fetchFalso.mock.calls[0][0] as string, 'http://x')
    expect(url.searchParams.get('servicos')).toBe('8')
    expect(url.searchParams.get('nota')).toBe('7')
  })

  it('explica quando nenhum filme atende aos filtros', async () => {
    vi.stubGlobal('fetch', respostaCom({ filme: null }))

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))

    expect(await screen.findByRole('dialog')).toHaveTextContent(/nenhum filme/i)
  })

  it('sorteia de novo sem fechar o diálogo', async () => {
    const fetchFalso = respostaCom({ filme })
    vi.stubGlobal('fetch', fetchFalso)

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: /sortear de novo/i }))

    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('fecha o diálogo', async () => {
    vi.stubGlobal('fetch', respostaCom({ filme }))

    render(<BotaoSurpreendaMe filtros={FILTROS_PADRAO} />)
    await userEvent.click(screen.getByRole('button', { name: /surpreenda-me/i }))
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
