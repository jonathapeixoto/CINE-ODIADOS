import Link from 'next/link'

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-10 border-b border-borda bg-superficie-alta/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-xl italic tracking-tight text-texto transition-colors hover:text-acento"
        >
          O que assistir hoje
        </Link>
        <nav>
          <Link
            href="/minha-lista"
            className="text-sm font-medium text-texto-fraco transition-colors hover:text-acento"
          >
            Minha lista
          </Link>
        </nav>
      </div>
    </header>
  )
}
