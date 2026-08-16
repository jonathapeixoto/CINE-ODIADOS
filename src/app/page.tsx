import { BarraFiltros } from '@/components/filtros/BarraFiltros'
import { EstadoVazio } from '@/components/filtros/EstadoVazio'
import { SelecaoServicos } from '@/components/filtros/SelecaoServicos'
import { BotaoSurpreendaMe } from '@/components/filme/BotaoSurpreendaMe'
import { CarregarMais } from '@/components/filme/CarregarMais'
import { Destaque } from '@/components/filme/Destaque'
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

  // O destaque é o primeiro resultado da própria consulta — não uma escolha
  // editorial. Por isso ele troca quando um filtro troca, e o olho-de-boi pode
  // dizer, com honestidade, por que aquele filme está ali. Sem arte de fundo
  // não há destaque: um herói sem imagem é só um título grande no vazio.
  const destaque = pagina.filmes.find((filme) => filme.backdrop !== null) ?? null

  return (
    <main className="flex-1">
      {/* A página inteira é sobre a grade; o destaque é um item promovido dela.
          Por isso o <h1> nomeia a grade, e fica só para leitor de tela: quem
          enxerga já tem a marca no cabeçalho e o título do destaque na tela. */}
      <h1 className="sr-only">Filmes nos serviços de streaming que você assina</h1>

      {destaque && <Destaque filme={destaque} ordenacao={filtros.ordenacao} />}

      {/* O sticky vive na linha, não na BarraFiltros: a linha é filha direta
          da <main> alta, então tem espaço de sobra para "viajar" até colar
          logo abaixo do cabeçalho. Botão Surpreenda-me anda junto, então
          continua alcançável durante a rolagem. bg-fundo cobre o vão entre o
          painel de filtros e o botão para a grade não "vazar" por trás
          enquanto a linha está grudada. */}
      {/* O fundo opaco é do bloco de largura total, não do `envelope`: numa
          tela mais larga que a coluna, a grade apareceria rolando pelas beiras
          da barra grudada. */}
      <div
        className={`sticky top-[var(--altura-cabecalho)] z-30 bg-fundo ${destaque ? '' : 'mt-6'}`}
      >
        <div className="envelope flex flex-col-reverse gap-3 py-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1">
            <BarraFiltros filtros={filtros} provedores={provedores} generos={generos} />
          </div>
          <BotaoSurpreendaMe filtros={filtros} />
        </div>
      </div>

      <div className="envelope pb-16">
        <div className="mt-6 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-texto sm:text-2xl">Em cartaz para você</h2>
          <p className="shrink-0 text-sm tabular-nums text-texto-fraco">
            {pagina.totalResultados.toLocaleString('pt-BR')} filmes
          </p>
        </div>

        {pagina.filmes.length === 0 ? (
          <div className="mt-8">
            <EstadoVazio sugestao={await sugerirAfrouxamento(filtros)} />
          </div>
        ) : (
          <>
            <div className="mt-5">
              <GradeFilmes filmes={pagina.filmes} priorizarPrimeiros />
            </div>
            <CarregarMais
              filtros={filtros}
              paginaAtual={filtros.pagina}
              totalPaginas={pagina.totalPaginas}
            />
          </>
        )}
      </div>
    </main>
  )
}
