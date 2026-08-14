'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fundo/85 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none starting:opacity-0">
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filme sorteado"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-3xl border border-borda bg-superficie-alta p-6 text-center shadow-[0_0_0_1px_rgba(232,163,61,0.15),0_28px_70px_-16px_rgba(0,0,0,0.75)] transition-all duration-200 motion-reduce:transition-none starting:translate-y-3 starting:scale-95 starting:opacity-0 sm:max-w-md sm:p-7"
      >
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full text-texto-fraco transition-colors hover:bg-superficie hover:text-texto"
        >
          <IconeFechar />
        </button>

        {carregando && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex gap-2" aria-hidden="true">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-acento [animation-delay:-0.3s] motion-reduce:animate-none" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-acento [animation-delay:-0.15s] motion-reduce:animate-none" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-acento motion-reduce:animate-none" />
            </div>
            <p className="font-mono text-sm text-texto-fraco">Sorteando…</p>
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
                className="h-56 w-auto rounded-xl object-cover ring-1 ring-borda"
              />
            ) : (
              <div
                role="presentation"
                className="flex h-56 w-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-borda bg-superficie text-texto-fraco"
              >
                <IconeSemPoster />
                <span className="text-xs">Sem pôster</span>
              </div>
            )}

            <h2 className="mt-5 text-balance font-display text-2xl italic tracking-tight text-texto">
              {filme.titulo}
            </h2>
            <p className="mt-2 flex items-center gap-2 font-mono text-sm text-texto-fraco">
              <span className="rounded-full bg-acento/15 px-2 py-0.5 font-semibold text-acento">
                {filme.nota.toFixed(1)}
              </span>
              {filme.ano !== null && <span>{filme.ano}</span>}
            </p>
            {filme.sinopse && (
              <p className="mt-3 line-clamp-4 text-sm text-texto-fraco">{filme.sinopse}</p>
            )}

            <Link
              href={`/filme/${filme.id}`}
              className="mt-6 w-full rounded-full bg-acento px-6 py-2.5 text-sm font-semibold text-acento-texto transition-colors hover:bg-acento-forte"
            >
              Ver detalhes
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={aoSortearDeNovo}
          disabled={carregando}
          className="mt-3 w-full rounded-full border border-borda px-6 py-2.5 text-sm font-semibold text-texto transition-colors hover:border-acento hover:text-acento disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sortear de novo
        </button>
      </div>
    </div>
  )
}
