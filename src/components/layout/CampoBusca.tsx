'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Mesmo traço fino (stroke 1.75, cantos arredondados) dos outros ícones do
// app — aqui só para sinalizar "busca" de relance; o rótulo de verdade é o
// <label> associado ao campo, então o ícone fica decorativo.
function IconeLupa() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-texto-fraco"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  )
}

export function CampoBusca() {
  const router = useRouter()
  const [termo, setTermo] = useState('')

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault()
    const limpo = termo.trim()
    if (limpo === '') return
    router.push(`/busca?${new URLSearchParams({ q: limpo }).toString()}`)
  }

  return (
    <form role="search" onSubmit={buscar} className="w-full sm:w-auto sm:max-w-[15rem]">
      {/* Rótulo real para leitor de tela; visualmente o ícone + placeholder já
          dizem "busca", então o texto fica sr-only em vez de ocupar espaço
          num cabeçalho que já divide lugar com a marca e a navegação. */}
      <label htmlFor="busca" className="sr-only">
        Buscar filme
      </label>
      <div className="flex items-center gap-2 rounded-full border border-borda bg-superficie px-3.5 py-1 transition-colors focus-within:border-acento">
        <IconeLupa />
        <input
          id="busca"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Buscar filme…"
          className="min-w-0 flex-1 bg-transparent text-sm text-texto placeholder:text-texto-fraco focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 text-xs font-semibold text-texto-fraco transition-colors hover:text-acento"
        >
          Buscar
        </button>
      </div>
    </form>
  )
}
