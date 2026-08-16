import 'server-only'
import { MAX_PAGINAS, REGIAO, REVALIDATE } from '@/lib/constantes'
import { paraQueryTmdb } from '@/lib/filtros'
import { SERVICOS_POPULARES } from '@/lib/servicos/populares'
import type {
  Disponibilidade,
  FilmeDetalhado,
  Filtros,
  Genero,
  PaginaDeFilmes,
  Provedor,
} from '@/lib/tipos'
import { buscarTmdb } from './cliente'
import {
  acharTrailer,
  mapearElenco,
  mapearFilme,
  mapearGenero,
  mapearProvedor,
  ordenarProvedores,
  urlImagem,
} from './mapeadores'
import type {
  FilmeDetalhadoCru,
  GenerosCrus,
  ListaCrua,
  ListaProvedoresCrua,
  ProvedoresCrus,
} from './tipos-crus'

export { ErroTmdb } from './cliente'
export { urlImagem, mapearFilme, mapearProvedor } from './mapeadores'

const paraPagina = (lista: ListaCrua): PaginaDeFilmes => ({
  filmes: lista.results.map(mapearFilme),
  totalPaginas: Math.min(lista.total_pages, MAX_PAGINAS),
  totalResultados: lista.total_results,
})

export async function descobrirFilmes(filtros: Filtros): Promise<PaginaDeFilmes> {
  const lista = await buscarTmdb<ListaCrua>('/discover/movie', paraQueryTmdb(filtros), {
    revalidate: REVALIDATE.descoberta,
  })
  return paraPagina(lista)
}

export async function buscarPorTitulo(termo: string, pagina: number): Promise<PaginaDeFilmes> {
  const lista = await buscarTmdb<ListaCrua>(
    '/search/movie',
    { query: termo, include_adult: 'false', page: String(Math.min(Math.max(pagina, 1), MAX_PAGINAS)) },
    { revalidate: REVALIDATE.busca },
  )
  return paraPagina(lista)
}

export async function obterFilme(id: number): Promise<FilmeDetalhado> {
  const cru = await buscarTmdb<FilmeDetalhadoCru>(
    `/movie/${id}`,
    { append_to_response: 'credits,videos', include_video_language: 'pt,en' },
    { revalidate: REVALIDATE.filme },
  )

  const base = mapearFilme(cru)

  // O TMDB devolve overview vazio quando não há tradução; buscamos o original.
  let sinopse = base.sinopse
  if (sinopse === null) {
    const emIngles = await buscarTmdb<FilmeDetalhadoCru>(
      `/movie/${id}`,
      { language: 'en-US' },
      { revalidate: REVALIDATE.filme },
    )
    sinopse = mapearFilme(emIngles).sinopse
  }

  return {
    ...base,
    sinopse,
    duracaoMin: cru.runtime ?? null,
    generos: (cru.genres ?? []).map(mapearGenero),
    elenco: mapearElenco(cru),
    trailerYoutubeId: acharTrailer(cru),
  }
}

export async function obterDisponibilidade(id: number): Promise<Disponibilidade> {
  const cru = await buscarTmdb<ProvedoresCrus>(`/movie/${id}/watch/providers`, {}, {
    revalidate: REVALIDATE.disponibilidade,
  })
  const regiao = cru.results?.[REGIAO]

  return {
    assinatura: ordenarProvedores((regiao?.flatrate ?? []).map(mapearProvedor)),
    aluguel: ordenarProvedores((regiao?.rent ?? []).map(mapearProvedor)),
    compra: ordenarProvedores((regiao?.buy ?? []).map(mapearProvedor)),
    gratis: ordenarProvedores([...(regiao?.free ?? []), ...(regiao?.ads ?? [])].map(mapearProvedor)),
    linkJustWatch: regiao?.link ?? null,
  }
}

/**
 * Só os serviços curados, na ordem curada — ver src/lib/servicos/populares.ts
 * para por que a lista não vem do display_priority do TMDB.
 *
 * `obterDisponibilidade` continua mostrando os provedores reais do filme, sem
 * passar por aqui: na página de detalhe a pergunta é "onde este filme está?",
 * e omitir a loja de aluguel seria esconder a resposta.
 */
export async function listarProvedores(): Promise<Provedor[]> {
  const cru = await buscarTmdb<ListaProvedoresCrua>(
    '/watch/providers/movie',
    { watch_region: REGIAO },
    { revalidate: REVALIDATE.listas },
  )
  const porId = new Map(cru.results.map((provedor) => [provedor.provider_id, provedor]))

  return SERVICOS_POPULARES.flatMap((servico, indice) => {
    const achado = porId.get(servico.principal)
    // Serviço que saiu do catálogo do TMDB some da barra em silêncio — o site
    // continua de pé com um serviço a menos, que é a falha benigna.
    if (achado === undefined) return []

    return [
      {
        id: servico.principal,
        nome: servico.rotulo,
        logo: urlImagem(achado.logo_path, 'w92'),
        prioridade: indice,
      },
    ]
  })
}

export async function listarGeneros(): Promise<Genero[]> {
  const cru = await buscarTmdb<GenerosCrus>('/genre/movie/list', {}, { revalidate: REVALIDATE.listas })
  return cru.genres.map(mapearGenero)
}
