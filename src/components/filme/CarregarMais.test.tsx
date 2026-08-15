import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CarregarMais } from '@/components/filme/CarregarMais'
import { FILTROS_PADRAO } from '@/lib/filtros'

const filme = (id: number) => ({
  id,
  titulo: `Filme ${id}`,
  sinopse: null,
  poster: null,
  backdrop: null,
  nota: 7,
  votos: 200,
  ano: 2020,
})

afterEach(() => vi.unstubAllGlobals())

describe('CarregarMais', () => {
  it('acrescenta a próxima página à lista', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ filmes: [filme(2)], totalPaginas: 3, totalResultados: 60 }),
      }),
    )

    render(<CarregarMais filtros={FILTROS_PADRAO} paginaAtual={1} totalPaginas={3} />)
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }))

    expect(await screen.findByText('Filme 2')).toBeInTheDocument()
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(new URL(url, 'http://x').searchParams.get('pagina')).toBe('2')
  })

  it('some quando a última página já foi carregada', () => {
    render(<CarregarMais filtros={FILTROS_PADRAO} paginaAtual={3} totalPaginas={3} />)
    expect(screen.queryByRole('button', { name: /carregar mais/i })).not.toBeInTheDocument()
  })

  it('descarta as páginas extras quando os filtros mudam', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ filmes: [filme(2)], totalPaginas: 3, totalResultados: 60 }),
      }),
    )

    const { rerender } = render(
      <CarregarMais filtros={FILTROS_PADRAO} paginaAtual={1} totalPaginas={3} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }))
    expect(await screen.findByText('Filme 2')).toBeInTheDocument()

    // Mesma posição na árvore, mesmo tipo: sem chave, o React preservaria o
    // estado e a página 2 do filtro antigo continuaria pendurada embaixo da
    // página 1 do filtro novo.
    rerender(
      <CarregarMais
        filtros={{ ...FILTROS_PADRAO, generos: [35] }}
        paginaAtual={1}
        totalPaginas={3}
      />,
    )

    expect(screen.queryByText('Filme 2')).not.toBeInTheDocument()

    // E a contagem também volta ao zero: o próximo clique pede a página 2 do
    // filtro novo, em vez de pular direto para a 3.
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }))
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0] as string
    expect(new URL(url, 'http://x').searchParams.get('pagina')).toBe('2')
  })

  it('mostra recado quando a API falha e mantém o botão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))

    render(<CarregarMais filtros={FILTROS_PADRAO} paginaAtual={1} totalPaginas={3} />)
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não consegui carregar/i)
    expect(screen.getByRole('button', { name: /carregar mais/i })).toBeInTheDocument()
  })
})
