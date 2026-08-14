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
        {/* Sem utilitário `order-*`: a ordem de tabulação segue o DOM, então a
            ordem visual precisa ser a mesma em toda largura. No mobile ela
            não cabe ao lado da marca — sendo `w-full` (e vindo depois da
            marca no DOM), ela força sua própria linha, e "Minha lista"
            (também sem `order`, cai onde o DOM manda) desce pra linha
            seguinte. No desktop, uma única linha, nessa mesma ordem do DOM:
            marca, busca, nav. */}
        <div className="w-full sm:flex sm:w-auto sm:flex-1 sm:justify-center">
          <CampoBusca />
        </div>
        <nav className="ml-auto sm:ml-0">
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
