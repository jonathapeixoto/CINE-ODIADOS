import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OndeAssistir } from '@/components/filme/OndeAssistir'
import type { Disponibilidade } from '@/lib/tipos'

const netflix = { id: 8, nome: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/n.jpg', prioridade: 1 }
const google = { id: 3, nome: 'Google Play', logo: 'https://image.tmdb.org/t/p/w92/g.jpg', prioridade: 5 }

const vazia: Disponibilidade = {
  assinatura: [],
  aluguel: [],
  compra: [],
  gratis: [],
  linkJustWatch: null,
}

describe('OndeAssistir', () => {
  it('mostra os grupos que têm provedor', () => {
    render(
      <OndeAssistir
        disponibilidade={{ ...vazia, assinatura: [netflix], aluguel: [google], linkJustWatch: 'https://jw' }}
      />,
    )

    expect(screen.getByText('Na assinatura')).toBeInTheDocument()
    expect(screen.getByAltText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Para alugar')).toBeInTheDocument()
    expect(screen.getByAltText('Google Play')).toBeInTheDocument()
  })

  it('omite os grupos vazios', () => {
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [netflix], linkJustWatch: 'https://jw' }} />)

    expect(screen.queryByText('Para alugar')).not.toBeInTheDocument()
    expect(screen.queryByText('Para comprar')).not.toBeInTheDocument()
  })

  it('mostra o nome no lugar do logo quando o provedor não tem imagem', () => {
    const semLogo = { id: 42, nome: 'Canal Sem Logo', logo: null, prioridade: 3 }
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [semLogo] }} />)

    expect(screen.getByText('Canal Sem Logo')).toBeInTheDocument()
    // Nada de <img src=""> — o next/image recusa src vazio.
    expect(document.querySelector('img')).toBeNull()
  })

  it('diz explicitamente quando não há streaming no Brasil', () => {
    render(<OndeAssistir disponibilidade={vazia} />)
    expect(screen.getByText(/não disponível em streaming no Brasil no momento/i)).toBeInTheDocument()
  })

  it('leva ao JustWatch quando há link', () => {
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [netflix], linkJustWatch: 'https://jw' }} />)
    expect(screen.getByRole('link', { name: /assistir/i })).toHaveAttribute('href', 'https://jw')
  })

  it('não mostra botão de assistir sem link', () => {
    render(<OndeAssistir disponibilidade={{ ...vazia, assinatura: [netflix] }} />)
    expect(screen.queryByRole('link', { name: /assistir/i })).not.toBeInTheDocument()
  })
})
