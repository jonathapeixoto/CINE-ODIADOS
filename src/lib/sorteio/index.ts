import { ITENS_POR_PAGINA, MAX_PAGINAS } from '@/lib/constantes'

export type Alvo = { pagina: number; indice: number }

export function itensNaUltimaPagina(totalResultados: number, totalPaginas: number): number {
  if (totalPaginas < 1) return 0
  const resto = totalResultados - (totalPaginas - 1) * ITENS_POR_PAGINA
  return Math.min(Math.max(resto, 0), ITENS_POR_PAGINA)
}

export function escolherAlvo(
  totalPaginas: number,
  itensUltimaPagina: number,
  rng: () => number,
): Alvo | null {
  if (totalPaginas < 1 || itensUltimaPagina < 1) return null

  const paginasUteis = Math.min(totalPaginas, MAX_PAGINAS)
  const pagina = Math.min(Math.floor(rng() * paginasUteis) + 1, paginasUteis)
  const itens = pagina === totalPaginas ? itensUltimaPagina : ITENS_POR_PAGINA
  const indice = Math.min(Math.floor(rng() * itens), itens - 1)

  return { pagina, indice }
}
