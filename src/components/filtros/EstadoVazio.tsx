import Link from 'next/link'
import { escreverFiltros, type RotuloFiltro } from '@/lib/filtros'
import type { Sugestao } from '@/lib/tmdb/sugestoes'

const NOMES: Record<RotuloFiltro, string> = {
  servicos: 'o filtro de serviços',
  generos: 'os gêneros escolhidos',
  nota: 'a nota mínima',
  duracao: 'o limite de duração',
  periodo: 'o período de lançamento',
}

// Claquete "sem sessão": mesma linguagem de placeholder tracejado usada no
// pôster ausente do PainelSorteio, aqui emprestada para o cinema vazio.
function IconeClaquete() {
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
      <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" />
      <path d="m4 10 1.2-4.6a1 1 0 0 1 1.2-.7l12.4 3a1 1 0 0 1 .7 1.2L19 10" />
      <path d="m8 5.2 2 4M13.5 4.3l2 4" />
    </svg>
  )
}

export function EstadoVazio({ sugestao }: { sugestao: Sugestao | null }) {
  if (sugestao === null) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-md border border-dashed border-borda bg-superficie px-6 py-16 text-center sm:py-20">
        <IconeClaquete />
        <p className="text-sm text-texto sm:text-base">
          Nenhum filme atende a esses filtros. Tente remover algum deles.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-md border border-dashed border-borda bg-superficie px-6 py-16 text-center sm:py-20">
      <IconeClaquete />
      <p className="max-w-sm text-sm text-texto sm:text-base">
        Nenhum filme atende a esses filtros. Sem {NOMES[sugestao.rotulo]}, aparecem{' '}
        <span className="font-semibold tabular-nums text-texto">{sugestao.ganho} filmes</span>.
      </p>
      <Link
        href={`/?${escreverFiltros(sugestao.filtros).toString()}`}
        className="mt-1 inline-flex items-center gap-2 rounded-sm bg-texto px-6 py-2.5 text-sm font-bold text-fundo transition-colors hover:bg-white"
      >
        Remover esse filtro
      </Link>
    </div>
  )
}
