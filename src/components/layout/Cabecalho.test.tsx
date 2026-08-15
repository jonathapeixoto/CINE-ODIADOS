import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Cabecalho } from '@/components/layout/Cabecalho'

// O Cabecalho renderiza o CampoBusca, um Client Component que usa useRouter.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('Cabecalho', () => {
  it('mantém marca → nav → busca na ordem do DOM (e de tabulação)', () => {
    render(<Cabecalho />)

    const marca = screen.getByRole('link', { name: /o que assistir hoje/i })
    const minhaLista = screen.getByRole('link', { name: /minha lista/i })
    const busca = screen.getByRole('searchbox', { name: /buscar/i })
    const botaoBuscar = screen.getByRole('button', { name: /buscar/i })

    // Todos os elementos focáveis do cabeçalho, na ordem em que aparecem no DOM.
    const focaveis = Array.from(
      document.querySelectorAll<HTMLElement>('header a, header input, header button'),
    )

    expect(focaveis).toEqual([marca, minhaLista, busca, botaoBuscar])
  })

  it('não usa nenhum utilitário de CSS `order-*` no cabeçalho', () => {
    render(<Cabecalho />)

    const header = document.querySelector('header')
    expect(header).not.toBeNull()

    // getAttribute('class') em vez de .className: em elementos SVG, .className
    // é um SVGAnimatedString, não uma string — o atributo cru funciona para os dois.
    const elementosComOrder = Array.from(header!.querySelectorAll<HTMLElement>('*')).filter(
      (elemento) => /(^|\s|:)order-/.test(elemento.getAttribute('class') ?? ''),
    )

    expect(elementosComOrder).toEqual([])
  })
})
