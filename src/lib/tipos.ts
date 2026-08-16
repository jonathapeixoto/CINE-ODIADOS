export type Genero = { id: number; nome: string }

export type Filme = {
  id: number
  titulo: string
  sinopse: string | null
  poster: string | null
  backdrop: string | null
  nota: number
  votos: number
  ano: number | null
}

export type Elenco = { id: number; nome: string; personagem: string; foto: string | null }

export type FilmeDetalhado = Filme & {
  duracaoMin: number | null
  generos: Genero[]
  elenco: Elenco[]
  trailerYoutubeId: string | null
}

/**
 * `logo: null` quando o TMDB não tem imagem do serviço; quem renderiza mostra o nome.
 * `prioridade` é ordem de exibição com duas origens: índice no roster curado
 * quando vem de `listarProvedores`, `display_priority` do TMDB quando vem da
 * disponibilidade de um filme. No caminho curado ela é só o índice do roster,
 * mantido pelo tipo por compatibilidade: a lista já chega ordenada de
 * `listarProvedores` e nada a reordena por esse campo.
 */
export type Provedor = { id: number; nome: string; logo: string | null; prioridade: number }

export type Disponibilidade = {
  assinatura: Provedor[]
  aluguel: Provedor[]
  compra: Provedor[]
  gratis: Provedor[]
  linkJustWatch: string | null
}

export type Ordenacao = 'popularidade' | 'nota' | 'lancamento'

/** `servicos: []` significa "todos os serviços", ou seja, sem filtro de provedor. */
export type Filtros = {
  servicos: number[]
  generos: number[]
  notaMinima: number | null
  duracaoMaxMin: number | null
  anoDe: number | null
  anoAte: number | null
  ordenacao: Ordenacao
  pagina: number
}

export type PaginaDeFilmes = {
  filmes: Filme[]
  totalPaginas: number
  totalResultados: number
}

export type ItemWatchlist = { id: number; titulo: string; poster: string | null }
