export type ServicoCurado = {
  /** O que aparece na tela. O nome do TMDB nem sempre serve: "HBO Max" virou
   *  Max, e "Telecine Amazon Channel" precisa aparecer como Telecine. */
  rotulo: string
  /** Id canônico: vai para a URL, identifica a entrada no cookie, e é dele que
   *  se pega o logo na resposta do TMDB. */
  principal: number
  /** Entradas irmãs do mesmo serviço no TMDB. Entram junto no filtro, senão
   *  marcar Max perderia todo filme catalogado só sob "HBO Max Amazon Channel". */
  apelidos: number[]
}

/**
 * A lista de serviços do site — curada, não calculada.
 *
 * O TMDB conhece 85 provedores de filme na região BR e os ordena por
 * `display_priority`, que não mede popularidade brasileira: nos quinze
 * primeiros aparecem FilmBox+, Sun Nxt, Eventive, Jolt Film e Cultpix, e o Max
 * fica na posição 28. Qualquer corte por top-N descartaria o Max e manteria o
 * Cultpix, e nenhum ajuste de N conserta isso.
 *
 * O custo é manutenção manual quando o mercado muda. É aceito: o mercado
 * brasileiro muda em escala de anos, e a lista tem treze linhas.
 *
 * Ids conferidos contra /watch/providers/movie?watch_region=BR em 2026-08-16.
 * Ausentes de propósito: Telecine avulso (227) e Star+ (619) não existem mais
 * na região BR; Apple TV Store (2), Google Play Filmes (3) e Amazon Video (10)
 * são lojas de aluguel, e a pergunta da barra é "quais serviços você assina".
 */
export const SERVICOS_POPULARES: ServicoCurado[] = [
  { rotulo: 'Netflix', principal: 8, apelidos: [1796] },
  { rotulo: 'Prime Video', principal: 119, apelidos: [2100] },
  { rotulo: 'Max', principal: 1899, apelidos: [1825] },
  { rotulo: 'Disney+', principal: 337, apelidos: [] },
  { rotulo: 'Globoplay', principal: 307, apelidos: [] },
  { rotulo: 'Apple TV+', principal: 350, apelidos: [] },
  { rotulo: 'Paramount+', principal: 531, apelidos: [2303, 582] },
  { rotulo: 'Telecine', principal: 2156, apelidos: [] },
  { rotulo: 'Crunchyroll', principal: 283, apelidos: [1968] },
  { rotulo: 'Claro tv+', principal: 484, apelidos: [167] },
  { rotulo: 'Looke', principal: 47, apelidos: [683] },
  { rotulo: 'Pluto TV', principal: 300, apelidos: [] },
  { rotulo: 'MUBI', principal: 11, apelidos: [201] },
]

const PRINCIPAIS = new Set(SERVICOS_POPULARES.map((servico) => servico.principal))

/** Apelido responde `false`: ele entra no filtro, mas não é serviço marcável. */
export const ehServicoCurado = (id: number): boolean => PRINCIPAIS.has(id)

export const filtrarCurados = (ids: number[]): number[] => ids.filter(ehServicoCurado)

/**
 * Traduz serviços marcados nos ids que o TMDB entende, apelidos incluídos.
 * A ordem é a do roster, para o resultado não depender da ordem do clique.
 */
export const idsParaFiltro = (principais: number[]): number[] =>
  SERVICOS_POPULARES.filter((servico) => principais.includes(servico.principal)).flatMap(
    (servico) => [servico.principal, ...servico.apelidos],
  )
