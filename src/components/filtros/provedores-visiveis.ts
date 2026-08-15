import type { Provedor } from '@/lib/tipos'

/** Quantos serviços a barra de filtros mostra antes de precisar do "mais serviços". */
export const SERVICOS_NA_BARRA = 12

/** Quantos serviços a tela de primeira visita mostra antes do "ver todos". */
export const SERVICOS_NA_PRIMEIRA_VISITA = 20

/**
 * O TMDB devolve na casa da centena de provedores para `watch_region=BR`, a
 * maioria canal avulso e serviço de nicho. Mostrar todos deixaria a barra fixa
 * mais alta que a viewport — ela cobriria justamente a grade que filtra. Como a
 * lista já chega ordenada por `display_priority`, cortar na cabeça deixa os
 * serviços úteis à vista.
 *
 * O que nunca some é um serviço marcado: se o filtro do usuário caiu fora da
 * cabeça, ele vem junto no fim. Escondê-lo faria o filtro desaparecer da barra
 * sem aviso, e o usuário perderia a única pista de que ainda está ativo.
 */
export function provedoresVisiveis(
  provedores: Provedor[],
  selecionados: number[],
  limite: number,
): Provedor[] {
  const cabeca = provedores.slice(0, limite)
  const marcadosDeFora = provedores.slice(limite).filter((p) => selecionados.includes(p.id))
  return [...cabeca, ...marcadosDeFora]
}
