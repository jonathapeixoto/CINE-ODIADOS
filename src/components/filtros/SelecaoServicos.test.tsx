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
})
