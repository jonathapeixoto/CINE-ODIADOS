import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Rodape } from '@/components/layout/Rodape'

describe('Rodape', () => {
  it('credita o JustWatch como fonte dos dados de streaming', () => {
    render(<Rodape />)
    expect(screen.getByText(/fornecidos por JustWatch/i)).toBeInTheDocument()
  })

  it('mostra o aviso exigido pelos termos do TMDB', () => {
    render(<Rodape />)
    expect(
      screen.getByText(/não é endossado, certificado ou aprovado pelo TMDB/i),
    ).toBeInTheDocument()
  })

  it('mostra o logo do TMDB com texto alternativo', () => {
    render(<Rodape />)
    expect(screen.getByAltText('TMDB')).toBeInTheDocument()
  })
})
