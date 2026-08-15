import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { SERVICOS_NA_BARRA } from '@/components/filtros/provedores-visiveis'
import { FILTROS_PADRAO } from '@/lib/filtros'

const { estado } = vi.hoisted(() => ({ estado: { push: vi.fn() } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: estado.push }),
}))

const provedores = [
  { id: 8, nome: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/n.jpg', prioridade: 1 },
  { id: 119, nome: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/w92/a.jpg', prioridade: 2 },
]
const generos = [
  { id: 35, nome: 'Comédia' },
  { id: 28, nome: 'Ação' },
]

const urlDoPush = () => new URL(estado.push.mock.calls.at(-1)![0], 'http://x')

describe('BarraFiltros', () => {
  beforeEach(() => estado.push.mockClear())

  it('liga um serviço e reescreve a URL', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))

    expect(urlDoPush().searchParams.get('servicos')).toBe('8')
    expect(estado.push.mock.calls.at(-1)![1]).toEqual({ scroll: false })
  })

  it('desliga um serviço já ativo', async () => {
    render(
      <BarraFiltros filtros={{ ...FILTROS_PADRAO, servicos: [8, 119] }} provedores={provedores} generos={generos} />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))

    expect(urlDoPush().searchParams.get('servicos')).toBe('119')
  })

  it('volta para a página 1 ao mexer em qualquer filtro', async () => {
    render(
      <BarraFiltros filtros={{ ...FILTROS_PADRAO, pagina: 7 }} provedores={provedores} generos={generos} />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Comédia' }))

    expect(urlDoPush().searchParams.get('pagina')).toBeNull()
    expect(urlDoPush().searchParams.get('generos')).toBe('35')
  })

  it('escreve a nota mínima escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    expect(urlDoPush().searchParams.get('nota')).toBe('7')
  })

  it('escreve a duração máxima escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Duração máxima'), '120')

    expect(urlDoPush().searchParams.get('duracao')).toBe('120')
  })

  it('escreve a ordenação escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'nota')

    expect(urlDoPush().searchParams.get('ordem')).toBe('nota')
  })

  // O TMDB real devolve na casa da centena de provedores no Brasil; a barra é
  // fixa no topo, então mostrar todos cobriria a grade que ela filtra.
  const muitos = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    nome: `Serviço ${i + 1}`,
    logo: null,
    prioridade: i + 1,
  }))

  it('mostra só a cabeça da lista de serviços e revela o resto sob demanda', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={muitos} generos={generos} />)

    expect(screen.getByRole('checkbox', { name: `Serviço ${SERVICOS_NA_BARRA}` })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Serviço 40' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /mais 28 serviços/i }))

    expect(screen.getByRole('checkbox', { name: 'Serviço 40' })).toBeInTheDocument()
  })

  it('mantém à vista um serviço marcado que ficou fora da cabeça da lista', () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, servicos: [37] }}
        provedores={muitos}
        generos={generos}
      />,
    )

    // Sem isso o filtro sumiria da barra e o usuário não teria como desligá-lo.
    expect(screen.getByRole('checkbox', { name: 'Serviço 37' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Serviço 38' })).not.toBeInTheDocument()
  })

  it('marca visualmente os filtros ativos', () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, servicos: [8], generos: [35], notaMinima: 7 }}
        provedores={provedores}
        generos={generos}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Comédia' })).toBeChecked()
    expect(screen.getByLabelText('Nota mínima')).toHaveValue('7')
  })
})
