'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { lerWatchlist } from '@/lib/preferencias'
import type { ItemWatchlist } from '@/lib/tipos'

// Mesmo vocabulário tracejado/monocromático do pôster ausente (CardFilme) e
// da claquete do estado vazio (EstadoVazio) — aqui, um marcador de página em
// branco, para dizer "nada guardado ainda" sem depender só do texto.
function IconeMarcadorVazio() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-9 w-9 text-texto-fraco opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-3.9L5.5 21V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function IconeSemPoster() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-8 w-8 opacity-60"
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

export default function MinhaLista() {
  const [itens, setItens] = useState<ItemWatchlist[] | null>(null)

  // Ler no efeito: no servidor não há localStorage, e divergir aqui quebra a hidratação.
  useEffect(() => setItens(lerWatchlist()), [])

  return (
    <main
      aria-busy={itens === null}
      className="envelope flex-1 py-10"
    >
      <h1 className="font-display text-3xl font-bold tracking-tight text-texto sm:text-4xl">
        Minha lista
      </h1>

      {itens !== null && itens.length === 0 && (
        <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 rounded-md border border-dashed border-borda bg-superficie px-6 py-16 text-center sm:py-20">
          <IconeMarcadorVazio />
          <p className="text-sm text-texto sm:text-base">Você ainda não salvou nenhum filme.</p>
        </div>
      )}

      {itens !== null && itens.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {itens.map((item) => (
            <li key={item.id}>
              <Link href={`/filme/${item.id}`} className="group block">
                {item.poster ? (
                  <Image
                    src={item.poster}
                    alt=""
                    width={342}
                    height={513}
                    sizes="(min-width: 1536px) 14vw, (min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 640px) 25vw, 45vw"
                    className="h-auto w-full rounded-sm object-cover ring-1 ring-borda transition duration-300 group-hover:ring-acento motion-safe:group-hover:-translate-y-1"
                  />
                ) : (
                  <div
                    role="presentation"
                    className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-borda bg-superficie text-texto-fraco transition group-hover:border-acento"
                  >
                    <IconeSemPoster />
                    <span className="text-xs">Sem pôster</span>
                  </div>
                )}
                <h3 className="mt-2.5 truncate text-[13px] font-medium text-texto transition-colors group-hover:text-acento">
                  {item.titulo}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
