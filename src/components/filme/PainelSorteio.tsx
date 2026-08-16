'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Filme } from '@/lib/tipos'

const SELETOR_FOCAVEIS = 'a[href], button:not([disabled])'

function IconeFechar() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function IconeSemPoster() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-7 w-7 opacity-60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3 16l4.7-4.7a1.5 1.5 0 0 1 2.1 0L15 16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 20.5l17-17" strokeLinecap="round" />
    </svg>
  )
}

export function PainelSorteio({
  filme,
  carregando,
  aoFechar,
  aoSortearDeNovo,
}: {
  filme: Filme | null
  carregando: boolean
  aoFechar: () => void
  aoSortearDeNovo: () => void
}) {
  const painelRef = useRef<HTMLDivElement>(null)
  const aoFecharRef = useRef(aoFechar)

  useEffect(() => {
    aoFecharRef.current = aoFechar
  })

  // Foca o painel só na abertura (deps vazio) — se dependesse de aoFechar,
  // que é recriada a cada render do pai, roubaria o foco de novo a cada
  // troca de "carregando"/"filme" enquanto o diálogo já está aberto.
  useEffect(() => {
    painelRef.current?.focus()

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        aoFecharRef.current()
        return
      }

      if (evento.key !== 'Tab' || !painelRef.current) return
      const focaveis = painelRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS)
      if (focaveis.length === 0) return

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  // O diálogo nasce dentro da linha de filtros, que é `sticky` e por isso abre
  // um contexto de empilhamento próprio: lá dentro, nenhum z-index alcança o
  // cabeçalho fixo, e ele ficaria por cima do véu escuro. O portal tira o
  // diálogo dessa caixa e o pendura no <body>, onde o z-50 vale de verdade.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fundo/90 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none starting:opacity-0">
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filme sorteado"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-md border border-borda bg-superficie-alta p-6 text-center shadow-[0_0_0_1px_rgba(216,31,60,0.18),0_34px_80px_-18px_rgba(0,0,0,0.9)] transition-all duration-200 motion-reduce:transition-none starting:translate-y-3 starting:scale-95 starting:opacity-0 sm:max-w-md sm:p-7"
      >
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
        >
          <IconeFechar />
        </button>

        {carregando && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex gap-2" aria-hidden="true">
              <span className="h-2 w-2 animate-bounce rounded-full bg-acento [animation-delay:-0.3s] motion-reduce:animate-none" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-acento [animation-delay:-0.15s] motion-reduce:animate-none" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-acento motion-reduce:animate-none" />
            </div>
            <p className="text-sm text-texto-fraco">Sorteando…</p>
          </div>
        )}

        {!carregando && filme === null && (
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="max-w-xs text-sm text-texto sm:text-base">
              Nenhum filme atende a esses filtros. Tente afrouxar algum deles.
            </p>
          </div>
        )}

        {!carregando && filme !== null && (
          <div className="flex flex-col items-center pt-2">
            {filme.poster ? (
              <Image
                src={filme.poster}
                alt={filme.titulo}
                width={220}
                height={330}
                className="h-56 w-auto rounded-sm object-cover ring-1 ring-borda"
              />
            ) : (
              <div
                role="presentation"
                className="flex h-56 w-40 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-borda bg-superficie text-texto-fraco"
              >
                <IconeSemPoster />
                <span className="text-xs">Sem pôster</span>
              </div>
            )}

            <h2 className="mt-5 text-balance font-display text-2xl font-bold text-texto">
              {filme.titulo}
            </h2>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm tabular-nums text-texto-fraco">
              <span className="font-semibold text-texto">{filme.nota.toFixed(1)}</span>
              {filme.ano !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{filme.ano}</span>
                </>
              )}
            </p>
            {filme.sinopse && (
              // Só a sinopse escapa da centralização do painel: quatro linhas
              // centralizadas viram um bloco de bordas irregulares, e o texto
              // corrido é o único elemento aqui que se lê, não se olha.
              <p className="mt-3 line-clamp-4 text-left text-sm leading-relaxed text-texto-fraco">
                {filme.sinopse}
              </p>
            )}

            <Link
              href={`/filme/${filme.id}`}
              className="mt-6 w-full rounded-sm bg-texto px-6 py-2.5 text-sm font-bold text-fundo transition-colors hover:bg-white"
            >
              Ver detalhes
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={aoSortearDeNovo}
          disabled={carregando}
          className="mt-3 w-full rounded-sm border border-borda bg-superficie px-6 py-2.5 text-sm font-semibold text-texto transition-colors hover:border-texto-fraco hover:bg-superficie-alta disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sortear de novo
        </button>
      </div>
    </div>,
    document.body,
  )
}
