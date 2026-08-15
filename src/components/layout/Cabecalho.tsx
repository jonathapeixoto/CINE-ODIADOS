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
        <nav>
          <Link
            href="/minha-lista"
            className="text-sm font-medium text-texto-fraco transition-colors hover:text-acento"
          >
            Minha lista
          </Link>
        </nav>
        {/* Sem utilitário `order-*`: a ordem do DOM é a ordem visual em toda
            largura, e é também a ordem de tabulação — as três concordam sem
            precisar de CSS pra desalinhar uma da outra. No mobile, marca e
            nav ficam juntas na linha 1 (a mesma dupla, com o mesmo
            `justify-between`, que já funcionava sozinha antes desta tarefa);
            a busca vem depois no DOM e, sendo `w-full`, não cabe nessa linha
            e cai pra linha 2 — cabeçalho com 2 linhas no mobile, não 3. No
            desktop ela cabe na mesma linha das outras duas; o
            `justify-between` do container prende a marca na borda esquerda e
            a busca (agora a última) na direita, com "Minha lista" flutuando
            no meio. */}
        <div className="w-full sm:w-auto">
          <CampoBusca />
        </div>
      </div>
    </header>
  )
}
