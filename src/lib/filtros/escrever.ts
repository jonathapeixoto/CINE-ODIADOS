import type { Filtros } from '@/lib/tipos'
import { FILTROS_PADRAO } from './ler'

export function escreverFiltros(filtros: Filtros): URLSearchParams {
  const params = new URLSearchParams()

  params.set('servicos', filtros.servicos.length > 0 ? filtros.servicos.join(',') : 'todos')
  if (filtros.generos.length > 0) params.set('generos', filtros.generos.join(','))
  if (filtros.notaMinima !== null) params.set('nota', String(filtros.notaMinima))
  if (filtros.duracaoMaxMin !== null) params.set('duracao', String(filtros.duracaoMaxMin))
  if (filtros.anoDe !== null) params.set('de', String(filtros.anoDe))
  if (filtros.anoAte !== null) params.set('ate', String(filtros.anoAte))
  if (filtros.ordenacao !== FILTROS_PADRAO.ordenacao) params.set('ordem', filtros.ordenacao)
  if (filtros.pagina !== FILTROS_PADRAO.pagina) params.set('pagina', String(filtros.pagina))

  return params
}
