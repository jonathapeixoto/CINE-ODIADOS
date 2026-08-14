export const REGIAO = 'BR'
export const IDIOMA = 'pt-BR'
export const MAX_PAGINAS = 500
export const MIN_VOTOS = 100
export const ITENS_POR_PAGINA = 20
export const BASE_TMDB_PADRAO = 'https://api.themoviedb.org/3'

export const REVALIDATE = {
  descoberta: 900,
  busca: 900,
  filme: 21600,
  disponibilidade: 21600,
  listas: 86400,
} as const
