export type FilmeCru = {
  id: number
  title?: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  release_date?: string
}

export type ListaCrua = {
  results: FilmeCru[]
  total_pages: number
  total_results: number
}

export type FilmeDetalhadoCru = FilmeCru & {
  runtime?: number | null
  genres?: { id: number; name: string }[]
  credits?: { cast?: { id: number; name: string; character?: string; profile_path?: string | null }[] }
  videos?: { results?: { key: string; site: string; type: string }[] }
}

export type ProvedorCru = {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
}

export type ProvedoresCrus = {
  results?: Record<
    string,
    {
      link?: string
      flatrate?: ProvedorCru[]
      rent?: ProvedorCru[]
      buy?: ProvedorCru[]
      free?: ProvedorCru[]
      ads?: ProvedorCru[]
    }
  >
}

export type GenerosCrus = { genres: { id: number; name: string }[] }
export type ListaProvedoresCrua = { results: ProvedorCru[] }
