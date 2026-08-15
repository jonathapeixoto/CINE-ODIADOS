'use client'
import { useEffect, useState } from 'react'
import { alternarWatchlist, estaNaWatchlist } from '@/lib/preferencias'
import type { ItemWatchlist } from '@/lib/tipos'

// Mesmo traço 1.75 dos outros ícones do app. Contorno quando o filme ainda
// não está guardado; a "aba" some e o desenho fecha (fill sólido) quando
// está — a mesma silhueta de marcador de página em dois estados, sem
// precisar de dois ícones diferentes.
function IconeMarcador({ preenchido }: { preenchido: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill={preenchido ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-3.9L5.5 21V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

export function BotaoWatchlist({ filme }: { filme: ItemWatchlist }) {
  const [salvo, setSalvo] = useState(false)

  // Ler no efeito: no servidor não há localStorage, e divergir aqui quebra a hidratação.
  useEffect(() => setSalvo(estaNaWatchlist(filme.id)), [filme.id])

  const alternar = () => {
    alternarWatchlist(filme)
    setSalvo((atual) => !atual)
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={salvo}
      className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        salvo
          ? 'border-acento bg-acento/15 text-acento'
          : 'border-borda text-texto-fraco hover:border-acento/60 hover:text-texto'
      }`}
    >
      <IconeMarcador preenchido={salvo} />
      {salvo ? 'Remover da minha lista' : 'Salvar na minha lista'}
    </button>
  )
}
