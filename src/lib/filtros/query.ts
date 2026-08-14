import { MAX_PAGINAS, MIN_VOTOS, REGIAO } from '@/lib/constantes'
import type { Filtros, Ordenacao } from '@/lib/tipos'

const ORDEM_TMDB: Record<Ordenacao, string> = {
  popularidade: 'popularity.desc',
  nota: 'vote_average.desc',
  lancamento: 'primary_release_date.desc',
}

export function paraQueryTmdb(filtros: Filtros, hoje: Date = new Date()): Record<string, string> {
  const query: Record<string, string> = {
    include_adult: 'false',
    page: String(Math.min(Math.max(filtros.pagina, 1), MAX_PAGINAS)),
    sort_by: ORDEM_TMDB[filtros.ordenacao],
  }

  if (filtros.servicos.length > 0) {
    query.watch_region = REGIAO
    query.with_watch_providers = filtros.servicos.join('|')
    query.with_watch_monetization_types = 'flatrate'
  }
  if (filtros.generos.length > 0) query.with_genres = filtros.generos.join(',')
  if (filtros.notaMinima !== null) query['vote_average.gte'] = String(filtros.notaMinima)
  if (filtros.notaMinima !== null || filtros.ordenacao === 'nota') {
    query['vote_count.gte'] = String(MIN_VOTOS)
  }
  if (filtros.duracaoMaxMin !== null) query['with_runtime.lte'] = String(filtros.duracaoMaxMin)
  if (filtros.anoDe !== null) query['primary_release_date.gte'] = `${filtros.anoDe}-01-01`
  if (filtros.anoAte !== null) query['primary_release_date.lte'] = `${filtros.anoAte}-12-31`

  // Sem isto, ordenar por lançamento traz filmes que ainda nem estrearam.
  if (filtros.ordenacao === 'lancamento') {
    const limite = hoje.toISOString().slice(0, 10)
    const atual = query['primary_release_date.lte']
    if (atual === undefined || atual > limite) query['primary_release_date.lte'] = limite
  }

  return query
}
