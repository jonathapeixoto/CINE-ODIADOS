import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EstadoVazio } from '@/components/filtros/EstadoVazio'
import { FILTROS_PADRAO } from '@/lib/filtros'

describe('EstadoVazio', () => {
  it('avisa que não há resultados quando não há sugestão', () => {
    render(<EstadoVazio sugestao={null} />)
    expect(screen.getByText(/nenhum filme/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('oferece remover o filtro mais restritivo com um clique', () => {
    render(
      <EstadoVazio
        sugestao={{ rotulo: 'nota', ganho: 120, filtros: { ...FILTROS_PADRAO, servicos: [8] } }}
      />,
    )

    const link = screen.getByRole('link', { name: /remover/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('servicos=8'))
    expect(screen.getByText(/120 filmes/)).toBeInTheDocument()
    expect(screen.getByText(/nota mínima/i)).toBeInTheDocument()
  })

  it('nomeia cada filtro de forma legível', () => {
    render(
      <EstadoVazio sugestao={{ rotulo: 'duracao', ganho: 9, filtros: FILTROS_PADRAO }} />,
    )
    expect(screen.getByText(/limite de duração/i)).toBeInTheDocument()
  })
})
