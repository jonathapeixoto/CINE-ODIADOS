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

/**
 * `destaque` é o par do botão claro do herói: mesma altura e mesmo peso, em
 * cinza translúcido, para os dois lerem como um par de ações. `linha` é a
 * versão discreta que mora no meio do texto da página de detalhe.
 */
type Variante = 'linha' | 'destaque'

const TAMANHO: Record<Variante, string> = {
  linha: 'px-4 py-2 text-sm',
  destaque: 'px-6 py-3 text-sm',
}

export function BotaoWatchlist({
  filme,
  variante = 'linha',
}: {
  filme: ItemWatchlist
  variante?: Variante
}) {
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
      className={`inline-flex items-center gap-2 rounded-sm border font-semibold transition-colors ${TAMANHO[variante]} ${
        salvo
          ? 'border-acento bg-acento/15 text-acento'
          : 'border-borda bg-superficie-alta/70 text-texto hover:border-texto-fraco hover:bg-superficie-alta'
      }`}
    >
      <IconeMarcador preenchido={salvo} />
      {salvo ? 'Remover da minha lista' : 'Salvar na minha lista'}
    </button>
  )
}
