import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { SelecaoServicos } from '@/components/filtros/SelecaoServicos'
import { GradeFilmes } from '@/components/filme/GradeFilmes'
import { lerFiltros, type ParamsBrutos } from '@/lib/filtros'
import { escolheuServicos, lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { descobrirFilmes, listarGeneros, listarProvedores } from '@/lib/tmdb'

export default async function Home({ searchParams }: { searchParams: Promise<ParamsBrutos> }) {
  if (!(await escolheuServicos())) {
    return <SelecaoServicos provedores={await listarProvedores()} />
  }

  const filtros = lerFiltros(await searchParams, await lerServicosDoCookie())
  const [pagina, provedores, generos] = await Promise.all([
    descobrirFilmes(filtros),
    listarProvedores(),
    listarGeneros(),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl italic tracking-tight text-texto sm:text-4xl">
        O que assistir hoje
      </h1>
      <div className="mt-6">
        <BarraFiltros filtros={filtros} provedores={provedores} generos={generos} />
      </div>
      <p className="mt-6 font-mono text-sm text-texto-fraco">
        {pagina.totalResultados} filmes encontrados
      </p>
      <div className="mt-8">
        <GradeFilmes filmes={pagina.filmes} />
      </div>
    </main>
  )
}
