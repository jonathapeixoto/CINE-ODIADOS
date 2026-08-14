import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampoBusca } from '@/components/layout/CampoBusca'

const { estado } = vi.hoisted(() => ({ estado: { push: vi.fn() } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: estado.push }) }))

describe('CampoBusca', () => {
  beforeEach(() => {
    estado.push.mockClear()
  })

  it('leva para a página de busca com o termo codificado', async () => {
    render(<CampoBusca />)

    await userEvent.type(screen.getByRole('searchbox', { name: /buscar/i }), 'de volta para o futuro')
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(estado.push).toHaveBeenCalledWith('/busca?q=de+volta+para+o+futuro')
  })

  it('não busca com o campo vazio', async () => {
    render(<CampoBusca />)
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(estado.push).not.toHaveBeenCalled()
  })

  it('ignora um termo só de espaços', async () => {
    render(<CampoBusca />)
    await userEvent.type(screen.getByRole('searchbox', { name: /buscar/i }), '   ')
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(estado.push).not.toHaveBeenCalled()
  })
})
