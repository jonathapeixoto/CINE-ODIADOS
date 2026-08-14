import type { Filtros } from '@/lib/tipos'

export type RotuloFiltro = 'servicos' | 'generos' | 'nota' | 'duracao' | 'periodo'

export type Variante = { rotulo: RotuloFiltro; filtros: Filtros }

export function variantesAfrouxadas(filtros: Filtros): Variante[] {
  const base = { ...filtros, pagina: 1 }
  const variantes: Variante[] = []

  if (filtros.servicos.length > 0) variantes.push({ rotulo: 'servicos', filtros: { ...base, servicos: [] } })
  if (filtros.generos.length > 0) variantes.push({ rotulo: 'generos', filtros: { ...base, generos: [] } })
  if (filtros.notaMinima !== null) variantes.push({ rotulo: 'nota', filtros: { ...base, notaMinima: null } })
  if (filtros.duracaoMaxMin !== null)
    variantes.push({ rotulo: 'duracao', filtros: { ...base, duracaoMaxMin: null } })
  if (filtros.anoDe !== null || filtros.anoAte !== null)
    variantes.push({ rotulo: 'periodo', filtros: { ...base, anoDe: null, anoAte: null } })

  return variantes
}
