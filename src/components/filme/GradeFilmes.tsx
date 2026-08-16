import { CardFilme } from './CardFilme'
import type { Filme } from '@/lib/tipos'

// grid-cols vai até 7 (breakpoint 2xl); cobrir os 7 primeiros cartões garante
// a primeira linha inteira em qualquer largura — e mais de uma linha nas
// telas mais estreitas, onde há menos colunas.
export const QTD_PRIORITARIA = 7

export function GradeFilmes({
  filmes,
  priorizarPrimeiros = false,
}: {
  filmes: Filme[]
  /** Só a primeira grade da página (nunca as páginas de "carregar mais") está acima da dobra. */
  priorizarPrimeiros?: boolean
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {filmes.map((filme, indice) => (
        <li key={filme.id}>
          <CardFilme filme={filme} prioridade={priorizarPrimeiros && indice < QTD_PRIORITARIA} />
        </li>
      ))}
    </ul>
  )
}
