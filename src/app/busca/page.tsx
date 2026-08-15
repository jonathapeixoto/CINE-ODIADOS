import { GradeFilmes } from '@/components/filme/GradeFilmes'
import { buscarPorTitulo } from '@/lib/tmdb'

export default async function PaginaBusca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const bruto = (await searchParams).q
  const termo = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim() ?? ''

  if (termo === '') {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl italic tracking-tight text-texto sm:text-4xl">
          Buscar filme
        </h1>
        <p className="mt-4 text-sm text-texto-fraco sm:text-base">
          Digite o nome de um filme para ver onde ele está disponível.
        </p>
      </main>
    )
  }

  const pagina = await buscarPorTitulo(termo, 1)

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-balance font-display text-3xl italic tracking-tight text-texto sm:text-4xl">
        Resultados para “{termo}”
      </h1>
      {pagina.filmes.length === 0 ? (
        <p className="mt-4 text-sm text-texto-fraco sm:text-base">
          Nenhum filme encontrado com esse nome.
        </p>
      ) : (
        <div className="mt-8">
          <GradeFilmes filmes={pagina.filmes} priorizarPrimeiros />
        </div>
      )}
    </main>
  )
}
