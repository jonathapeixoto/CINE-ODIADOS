import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SelecaoServicos } from '@/components/filtros/SelecaoServicos'

const { estado } = vi.hoisted(() => ({
  estado: { salvar: vi.fn(), refresh: vi.fn() },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: estado.refresh }) }))
vi.mock('@/lib/preferencias/servicos-cliente', () => ({ salvarServicos: estado.salvar }))

const provedores = [
  { id: 8, nome: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/n.jpg', prioridade: 1 },
  { id: 119, nome: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/w92/a.jpg', prioridade: 2 },
]

describe('SelecaoServicos', () => {
  beforeEach(() => {
    estado.salvar.mockClear()
    estado.refresh.mockClear()
  })

  it('salva os serviços marcados e atualiza a página', async () => {
    render(<SelecaoServicos provedores={provedores} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Netflix' }))
    await userEvent.click(screen.getByRole('button', { name: /ver filmes/i }))

    expect(estado.salvar).toHaveBeenCalledWith([8])
    expect(estado.refresh).toHaveBeenCalled()
  })

  it('permite entrar sem escolher nada', async () => {
    render(<SelecaoServicos provedores={provedores} />)

    await userEvent.click(screen.getByRole('button', { name: /pular/i }))

    expect(estado.salvar).toHaveBeenCalledWith([])
  })

  it('mostra o logo de cada serviço com o nome como alternativa', () => {
    render(<SelecaoServicos provedores={provedores} />)
    expect(screen.getByAltText('Netflix')).toBeInTheDocument()
  })

  it('mostra a lista inteira de serviços, sem gaveta', () => {
    // Vinte e cinco é de propósito maior que o roster real de treze: o que se
    // prova aqui é o contrato do componente — ele mostra a lista que recebe,
    // qualquer que seja o tamanho — e não o tamanho da lista curada.
    const muitos = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      nome: `Serviço ${i + 1}`,
      logo: null,
      prioridade: i,
    }))

    render(<SelecaoServicos provedores={muitos} />)

    expect(screen.getByRole('checkbox', { name: 'Serviço 1' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Serviço 25' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ver mais/i })).not.toBeInTheDocument()
  })

  it('mantém o nome acessível quando o serviço não tem logo', () => {
    render(<SelecaoServicos provedores={[{ id: 42, nome: 'Canal Sem Logo', logo: null, prioridade: 3 }]} />)

    // Mesmo nome acessível com imagem ou sem: aqui vem do texto, não do alt.
    expect(screen.getByRole('checkbox', { name: 'Canal Sem Logo' })).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })
})
