'use client'
import { useRef, useState } from 'react'
import { PainelSorteio } from './PainelSorteio'
import { escreverFiltros } from '@/lib/filtros'
import type { Filme, Filtros } from '@/lib/tipos'

// Um dado: o ícone assina visualmente "sorteio" sem precisar de palavra
// extra, e gira enquanto carrega — a única animação que empresta do
// vocabulário de jogo de azar do resto do botão.
function IconeDado({ girando }: { girando: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${girando ? 'motion-safe:animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="8.75" cy="8.75" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.25" cy="8.75" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.75" cy="15.25" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.25" cy="15.25" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BotaoSurpreendaMe({ filtros }: { filtros: Filtros }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [filme, setFilme] = useState<Filme | null>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)

  const sortear = async () => {
    setAberto(true)
    setCarregando(true)
    try {
      const resposta = await fetch(`/api/sortear?${escreverFiltros(filtros).toString()}`)
      const dados = (await resposta.json()) as { filme?: Filme | null }
      setFilme(resposta.ok ? (dados.filme ?? null) : null)
    } catch {
      setFilme(null)
    } finally {
      setCarregando(false)
    }
  }

  const fechar = () => {
    setAberto(false)
    // Devolve o foco pro botão que abriu o diálogo — sem isso, quem navega
    // por teclado perde a posição na página ao fechar.
    gatilhoRef.current?.focus()
  }

  return (
    <div className="relative flex shrink-0">
      <button
        ref={gatilhoRef}
        type="button"
        onClick={sortear}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-sm bg-acento px-6 py-2.5 text-sm font-bold text-acento-texto shadow-[0_10px_26px_-14px_rgba(216,31,60,0.85)] transition-colors hover:bg-acento-forte sm:w-auto"
      >
        <IconeDado girando={carregando} />
        Surpreenda-me
      </button>
      {aberto && (
        <PainelSorteio
          filme={filme}
          carregando={carregando}
          aoFechar={fechar}
          aoSortearDeNovo={sortear}
        />
      )}
    </div>
  )
}
