import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BotaoWatchlist } from '@/components/filme/BotaoWatchlist'
import { OndeAssistir } from '@/components/filme/OndeAssistir'
import { obterDisponibilidade, obterFilme } from '@/lib/tmdb'
import { ErroTmdb } from '@/lib/tmdb/cliente'

type Props = { params: Promise<{ id: string }> }

const lerId = (bruto: string): number => {
  const id = Number(bruto)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return id
}

// Um 404 do TMDB em qualquer uma das duas chamadas significa que o filme não
// existe. Vale também para a de disponibilidade: para um id inexistente ela
// responde 404, e não uma lista vazia como faz para um filme sem streaming.
async function ou404<T>(promessa: Promise<T>): Promise<T> {
  try {
    return await promessa
  } catch (erro) {
    if (erro instanceof ErroTmdb && erro.status === 404) notFound()
    throw erro
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filme = await ou404(obterFilme(lerId((await params).id)))
  return {
    title: `${filme.titulo} — CineOdiados`,
    description:
      filme.sinopse ?? 'Veja em quais serviços de streaming este filme está disponível no Brasil.',
  }
}

function IconeSemPoster() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-7 w-7 opacity-60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3 16l4.7-4.7a1.5 1.5 0 0 1 2.1 0L15 16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 20.5l17-17" strokeLinecap="round" />
    </svg>
  )
}

export default async function PaginaFilme({ params }: Props) {
  const id = lerId((await params).id)
  const [filme, disponibilidade] = await Promise.all([
    ou404(obterFilme(id)),
    ou404(obterDisponibilidade(id)),
  ])

  return (
    <main className="flex-1 pb-16">
      {/* A margem negativa cancela o respiro que o <body> dá ao cabeçalho fixo,
          do mesmo jeito que o destaque da home faz: a arte começa no topo da
          janela e o cabeçalho transparente flutua sobre ela. O véu de cima
          existe só para o cabeçalho continuar legível sobre qualquer imagem. */}
      {filme.backdrop && (
        <div className="relative -mt-[var(--altura-cabecalho)] h-[42vh] min-h-[260px] w-full overflow-hidden sm:h-[54vh] sm:max-h-[520px]">
          <Image
            src={filme.backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_25%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-fundo via-fundo/55 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-fundo/70 to-transparent"
          />
        </div>
      )}

      <div
        className={`envelope ${filme.backdrop ? 'relative z-10 -mt-20 sm:-mt-28' : 'pt-10'}`}
      >
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-6">
          {filme.poster ? (
            <Image
              src={filme.poster}
              alt={filme.titulo}
              width={220}
              height={330}
              priority
              className="h-auto w-28 shrink-0 rounded-sm object-cover shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)] ring-1 ring-borda sm:w-36 md:w-44"
            />
          ) : (
            <div
              role="presentation"
              className="flex aspect-[2/3] w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-borda bg-superficie text-texto-fraco shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)] sm:w-36 md:w-44"
            >
              <IconeSemPoster />
              <span className="text-xs">Sem pôster</span>
            </div>
          )}

          <div className="min-w-0 flex-1 pb-1">
            <h1 className="marquise text-balance text-3xl text-texto sm:text-5xl">
              {filme.titulo}
            </h1>

            {/* Os fatos vêm antes da ação: quem chega aqui decide olhando nota,
                ano e duração, e só então guarda o filme para depois. */}
            <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm tabular-nums text-texto-fraco">
              <span className="font-semibold text-texto">{filme.nota.toFixed(1)}</span>
              <span aria-hidden="true">·</span>
              <span>{filme.votos.toLocaleString('pt-BR')} votos</span>
              {filme.ano !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{filme.ano}</span>
                </>
              )}
              {filme.duracaoMin !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{filme.duracaoMin} min</span>
                </>
              )}
            </p>

            {filme.generos.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {filme.generos.map((genero) => (
                  <li
                    key={genero.id}
                    className="rounded-sm border border-borda px-3 py-1 text-xs text-texto-fraco"
                  >
                    {genero.nome}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5">
              <BotaoWatchlist filme={{ id: filme.id, titulo: filme.titulo, poster: filme.poster }} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <OndeAssistir disponibilidade={disponibilidade} />
        </div>

        {filme.sinopse && (
          <p className="mt-8 max-w-3xl text-[15px] leading-relaxed text-texto-fraco sm:text-base">
            {filme.sinopse}
          </p>
        )}

        {filme.trailerYoutubeId && (
          <section aria-labelledby="trailer" className="mt-10">
            <h2 id="trailer" className="font-display text-2xl font-bold text-texto">
              Trailer
            </h2>
            <div className="mt-4 aspect-video overflow-hidden rounded-md ring-1 ring-borda">
              <iframe
                title={`Trailer de ${filme.titulo}`}
                src={`https://www.youtube.com/embed/${filme.trailerYoutubeId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </section>
        )}

        {filme.elenco.length > 0 && (
          <section aria-labelledby="elenco" className="mt-10">
            <h2 id="elenco" className="font-display text-2xl font-bold text-texto">
              Elenco
            </h2>
            <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {filme.elenco.map((ator) => (
                <li key={ator.id}>
                  {ator.foto ? (
                    <Image
                      src={ator.foto}
                      alt={ator.nome}
                      width={185}
                      height={278}
                      className="h-auto w-full rounded-sm object-cover ring-1 ring-borda"
                    />
                  ) : (
                    <div
                      role="presentation"
                      className="flex aspect-[2/3] w-full flex-col items-center justify-center rounded-sm border border-dashed border-borda bg-superficie text-texto-fraco"
                    >
                      <IconeSemPoster />
                    </div>
                  )}
                  <p className="mt-2 truncate text-sm font-medium text-texto">{ator.nome}</p>
                  {ator.personagem && (
                    <p className="truncate text-xs text-texto-fraco">{ator.personagem}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
