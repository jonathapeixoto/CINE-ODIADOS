import Link from 'next/link'
import { CampoBusca } from './CampoBusca'

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-10 border-b border-borda bg-superficie-alta/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-6">
        <Link
          href="/"
          className="font-display text-xl italic tracking-tight text-texto transition-colors hover:text-acento"
        >
          O que assistir hoje
        </Link>
        {/* Sozinha na sua própria linha no mobile (não cabe ao lado da marca e
            do "Minha lista" numa tela estreita); no desktop volta pra mesma
            linha, encolhida entre os dois. */}
        <div className="order-3 w-full sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
          <CampoBusca />
        </div>
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
