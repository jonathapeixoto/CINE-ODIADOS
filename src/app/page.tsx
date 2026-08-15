import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { EstadoVazio } from '@/components/filtros/EstadoVazio'
import { SelecaoServicos } from '@/components/filtros/SelecaoServicos'
import { BotaoSurpreendaMe } from '@/components/filme/BotaoSurpreendaMe'
import { CarregarMais } from '@/components/filme/CarregarMais'
import { GradeFilmes } from '@/components/filme/GradeFilmes'
import { lerFiltros, type ParamsBrutos } from '@/lib/filtros'
import { escolheuServicos, lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { descobrirFilmes, listarGeneros, listarProvedores } from '@/lib/tmdb'
import { sugerirAfrouxamento } from '@/lib/tmdb/sugestoes'

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
      {/* O sticky vive na linha, não na BarraFiltros: a linha é filha direta
          da <main> alta, então tem espaço de sobra para "viajar" até colar
          logo abaixo do cabeçalho. Botão Surpreenda-me anda junto, então
          continua alcançável durante a rolagem. bg-fundo cobre o vão entre o
          painel de filtros e o botão para a grade não "vazar" por trás
          enquanto a linha está grudada. */}
      <div className="sticky top-[var(--altura-cabecalho)] z-[9] mt-6 flex flex-col-reverse gap-4 bg-fundo py-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1">
          <BarraFiltros filtros={filtros} provedores={provedores} generos={generos} />
        </div>
        <BotaoSurpreendaMe filtros={filtros} />
      </div>
      <p className="mt-6 font-mono text-sm text-texto-fraco">
        {pagina.totalResultados} filmes encontrados
      </p>
      {pagina.filmes.length === 0 ? (
        <div className="mt-8">
          <EstadoVazio sugestao={await sugerirAfrouxamento(filtros)} />
        </div>
      ) : (
        <>
          <div className="mt-8">
            <GradeFilmes filmes={pagina.filmes} priorizarPrimeiros />
          </div>
          <CarregarMais
            filtros={filtros}
            paginaAtual={filtros.pagina}
            totalPaginas={pagina.totalPaginas}
          />
        </>
      )}
    </main>
  )
}
