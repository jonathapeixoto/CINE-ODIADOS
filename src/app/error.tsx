'use client'

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-2xl text-texto sm:text-3xl">Não consegui carregar os filmes</h1>
      <p className="mt-3 max-w-md text-sm text-texto-fraco">
        Pode ter sido uma instabilidade do TMDB. Tente de novo em alguns segundos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-acento px-5 py-2 text-sm font-semibold text-acento-texto transition-colors hover:bg-acento-forte"
      >
        Tentar de novo
      </button>
    </main>
  )
}
