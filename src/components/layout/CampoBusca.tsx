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
    <form role="search" onSubmit={buscar} className="min-w-0 flex-1 sm:w-64 sm:flex-none">
      {/* Rótulo real para leitor de tela; visualmente o ícone + placeholder já
          dizem "busca", então o texto fica sr-only em vez de ocupar espaço
          num cabeçalho que já divide lugar com a marca e a navegação. */}
      <label htmlFor="busca" className="sr-only">
        Buscar filme
      </label>
      <div className="flex items-center gap-2 rounded-sm border border-borda bg-fundo/70 px-2.5 py-1.5 transition-colors focus-within:border-texto-fraco sm:px-3">
        <IconeLupa />
        <input
          id="busca"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Buscar filme…"
          className="min-w-0 flex-1 bg-transparent text-sm text-texto placeholder:text-texto-fraco focus:outline-none"
        />
        {/* No mobile a palavra vira uma seta: os ~40px que ela ocuparia são a
            diferença entre o campo caber e não caber na linha única do
            cabeçalho. O nome acessível continua "Buscar" nas duas larguras —
            é o texto do <span>, que só troca de forma visual. */}
        <button
          type="submit"
          className="flex shrink-0 items-center text-xs font-semibold text-texto-fraco transition-colors hover:text-texto"
        >
          <span className="sr-only sm:not-sr-only">Buscar</span>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            className="h-4 w-4 sm:hidden"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13M12 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </form>
  )
}
