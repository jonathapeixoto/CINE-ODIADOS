import type { Elenco, Filme, Genero, Provedor } from '@/lib/tipos'
import type { FilmeCru, FilmeDetalhadoCru, ProvedorCru } from './tipos-crus'

export function urlImagem(caminho: string | null | undefined, tamanho: string): string | null {
  return caminho ? `https://image.tmdb.org/t/p/${tamanho}${caminho}` : null
}

const textoOuNulo = (valor: string | undefined): string | null => {
  const limpo = valor?.trim() ?? ''
  return limpo === '' ? null : limpo
}

export function mapearFilme(cru: FilmeCru): Filme {
  return {
    id: cru.id,
    titulo: textoOuNulo(cru.title) ?? textoOuNulo(cru.original_title) ?? 'Sem título',
    sinopse: textoOuNulo(cru.overview),
    poster: urlImagem(cru.poster_path, 'w342'),
    backdrop: urlImagem(cru.backdrop_path, 'w780'),
    nota: cru.vote_average ?? 0,
    votos: cru.vote_count ?? 0,
    ano: cru.release_date ? Number(cru.release_date.slice(0, 4)) : null,
  }
}

export function mapearGenero(cru: { id: number; name: string }): Genero {
  return { id: cru.id, nome: cru.name }
}

export function mapearProvedor(cru: ProvedorCru): Provedor {
  return {
    id: cru.provider_id,
    nome: cru.provider_name,
    logo: urlImagem(cru.logo_path, 'w92'),
    prioridade: cru.display_priority,
  }
}

export const ordenarProvedores = (provedores: Provedor[]): Provedor[] =>
  [...provedores].sort((a, b) => a.prioridade - b.prioridade)

export function mapearElenco(cru: FilmeDetalhadoCru): Elenco[] {
  return (cru.credits?.cast ?? []).slice(0, 8).map((ator) => ({
    id: ator.id,
    nome: ator.name,
    personagem: ator.character ?? '',
    foto: urlImagem(ator.profile_path, 'w185'),
  }))
}

export function acharTrailer(cru: FilmeDetalhadoCru): string | null {
  const video = (cru.videos?.results ?? []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
  return video?.key ?? null
}
