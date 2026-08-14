import 'server-only'
import { variantesAfrouxadas, type RotuloFiltro } from '@/lib/filtros'
import type { Filtros } from '@/lib/tipos'
import { descobrirFilmes } from '@/lib/tmdb'

export type Sugestao = { rotulo: RotuloFiltro; ganho: number; filtros: Filtros }

export async function sugerirAfrouxamento(filtros: Filtros): Promise<Sugestao | null> {
  const variantes = variantesAfrouxadas(filtros)
  if (variantes.length === 0) return null

  const contagens = await Promise.all(
    variantes.map(async (variante) => {
      try {
        const pagina = await descobrirFilmes(variante.filtros)
        return { ...variante, ganho: pagina.totalResultados }
      } catch {
        // Uma variante que falhou não pode derrubar a página inteira.
        return { ...variante, ganho: 0 }
      }
    }),
  )

  const melhor = contagens.reduce((a, b) => (b.ganho > a.ganho ? b : a))
  return melhor.ganho > 0 ? melhor : null
}
