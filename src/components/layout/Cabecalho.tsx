'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CampoBusca } from './CampoBusca'

export function Cabecalho() {
  const [rolou, setRolou] = useState(false)

  // No topo o cabeçalho é só um véu escuro: o destaque da home continua
  // inteiro por baixo dele, sem uma barra cortando a arte. Assim que a página
  // sai do lugar, ele fecha em fundo sólido para não disputar com a grade.
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 h-[var(--altura-cabecalho)] transition-colors duration-300 ${
        rolou
          ? 'border-b border-borda bg-fundo/95 backdrop-blur'
          : 'bg-gradient-to-b from-fundo/95 via-fundo/50 to-transparent'
      }`}
    >
      <div className="envelope flex h-full items-center gap-3 sm:gap-8">
        {/* Sem utilitário `order-*`: a ordem do DOM é a ordem visual em toda
            largura, e é também a ordem de tabulação — as três concordam sem
            precisar de CSS pra desalinhar uma da outra. O cabeçalho é de uma
            linha só em qualquer tela; quem cede espaço no mobile é a busca,
            que encolhe, e não a marca. */}
        <Link
          href="/"
          className="marquise shrink-0 text-lg text-acento transition-colors [text-shadow:0_2px_16px_rgba(216,31,60,0.45)] hover:text-acento-forte sm:text-2xl"
        >
          CineOdiados
        </Link>
        <nav className="shrink-0 sm:flex-1">
          <Link
            href="/minha-lista"
            className="whitespace-nowrap text-[13px] font-medium text-texto-fraco transition-colors hover:text-texto sm:text-sm"
          >
            Minha lista
          </Link>
        </nav>
        <CampoBusca />
      </div>
    </header>
  )
}
