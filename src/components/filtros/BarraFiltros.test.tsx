import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { FILTROS_PADRAO } from '@/lib/filtros'

const { estado } = vi.hoisted(() => ({ estado: { push: vi.fn(), salvar: vi.fn() } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: estado.push }),
}))
vi.mock('@/lib/preferencias/servicos-cliente', () => ({ salvarServicos: estado.salvar }))

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
  beforeEach(() => {
    estado.push.mockClear()
    estado.salvar.mockClear()
  })

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

  // §3 do design: os serviços assinados são escolhidos na primeira visita "e
  // depois editáveis". A barra é essa superfície de edição, então a troca
  // precisa chegar ao cookie — só na URL, voltar para "/" (o que o wordmark do
  // app faz) ressuscitaria a escolha da primeira visita.
  it('grava no cookie os serviços ligados pela barra', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))

    expect(estado.salvar).toHaveBeenCalledWith([8])
  })

  it('grava a lista vazia ao desligar o último serviço', async () => {
    render(
      <BarraFiltros filtros={{ ...FILTROS_PADRAO, servicos: [8] }} provedores={provedores} generos={generos} />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))

    // Lista vazia continua sendo uma escolha: escolheuServicos olha a presença
    // do cookie, não o conteúdo.
    expect(estado.salvar).toHaveBeenCalledWith([])
    expect(urlDoPush().searchParams.get('servicos')).toBe('todos')
  })

  it('não mexe no cookie quando o filtro alterado não é de serviço', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    expect(estado.salvar).not.toHaveBeenCalled()
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

  it('escreve os dois extremos do período ao escolher uma década', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Período'), 'Anos 1990')

    expect(urlDoPush().searchParams.get('de')).toBe('1990')
    expect(urlDoPush().searchParams.get('ate')).toBe('1999')
  })

  it('escreve só o início quando a década é aberta no fim', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Período'), '2020 em diante')

    expect(urlDoPush().searchParams.get('de')).toBe('2020')
    expect(urlDoPush().searchParams.get('ate')).toBeNull()
  })

  it('mostra selecionada a década que veio na URL', () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, anoDe: 2000, anoAte: 2009 }}
        provedores={provedores}
        generos={generos}
      />,
    )

    expect(screen.getByLabelText('Período')).toHaveValue('2000')
  })

  it('limpa o período ao voltar para "Qualquer"', async () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, anoDe: 2010, anoAte: 2019 }}
        provedores={provedores}
        generos={generos}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Período'), 'Qualquer')

    expect(urlDoPush().searchParams.get('de')).toBeNull()
    expect(urlDoPush().searchParams.get('ate')).toBeNull()
  })

  it('não finge "Qualquer" quando a URL traz um recorte fora das décadas', () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, anoDe: 1975, anoAte: 1981 }}
        provedores={provedores}
        generos={generos}
      />,
    )

    expect(screen.getByLabelText('Período')).not.toHaveValue('')
    expect(screen.getByRole('option', { name: '1975 a 1981' })).toBeDisabled()
  })

  it('conta o período entre os filtros ativos', () => {
    render(
      <BarraFiltros
        filtros={{ ...FILTROS_PADRAO, anoDe: 1990, anoAte: 1999 }}
        provedores={provedores}
        generos={generos}
      />,
    )

    expect(screen.getByRole('button', { name: /filtros/i })).toHaveTextContent('1')
  })

  it('escreve a ordenação escolhida', async () => {
    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={provedores} generos={generos} />)

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'nota')

    expect(urlDoPush().searchParams.get('ordem')).toBe('nota')
  })

  it('mostra a lista inteira de serviços, sem gaveta', () => {
    // Treze é o tamanho do roster curado (src/lib/servicos/populares.ts) — e
    // era um a mais que o antigo limite de 12 da barra, então a curadoria
    // sozinha teria escondido um serviço de verdade atrás do "mais serviços".
    const roster = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1,
      nome: `Serviço ${i + 1}`,
      logo: null,
      prioridade: i,
    }))

    render(<BarraFiltros filtros={FILTROS_PADRAO} provedores={roster} generos={generos} />)

    expect(screen.getByRole('checkbox', { name: 'Serviço 1' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Serviço 13' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mais \d+ serviços/i })).not.toBeInTheDocument()
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
