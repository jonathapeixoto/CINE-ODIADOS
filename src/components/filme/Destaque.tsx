import Image from 'next/image'
import Link from 'next/link'
import { BotaoWatchlist } from './BotaoWatchlist'
import type { Filme, Ordenacao } from '@/lib/tipos'

// O olho-de-boi não é enfeite: ele responde "por que esse filme está aqui?".
// Como o destaque é sempre o primeiro resultado da consulta, a resposta é
// literalmente a ordenação escolhida — e ela muda junto com o <select>.
const MOTIVO: Record<Ordenacao, string> = {
  popularidade: 'O mais popular nos seus serviços',
  nota: 'O melhor avaliado nos seus serviços',
  lancamento: 'O mais recente nos seus serviços',
}

function IconeInfo() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.6" />
    </svg>
  )
}

export function Destaque({ filme, ordenacao }: { filme: Filme; ordenacao: Ordenacao }) {
  return (
    <section
      aria-labelledby="destaque-titulo"
      // A margem negativa cancela o respiro que o <body> dá ao cabeçalho fixo:
      // a arte sobe até o topo da janela e o cabeçalho flutua por cima dela.
      className="relative -mt-[var(--altura-cabecalho)] flex min-h-[72vh] items-end overflow-hidden sm:min-h-[74vh] sm:max-h-[44rem]"
    >
      {filme.backdrop && (
        <Image
          src={filme.backdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_28%]"
        />
      )}

      {/* Três véus, cada um com um trabalho: da esquerda para o texto ter
          contraste, de baixo para a arte dissolver na grade, e do topo para o
          cabeçalho transparente continuar legível sobre qualquer imagem. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-fundo via-fundo/85 via-35% to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-fundo via-fundo/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-fundo/70 to-transparent"
      />

      <div className="envelope subir relative pb-10 pt-[calc(var(--altura-cabecalho)+3rem)] sm:pb-14">
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-texto-fraco">
          <span aria-hidden="true" className="h-4 w-[3px] rounded-full bg-acento" />
          {MOTIVO[ordenacao]}
        </p>

        <h2
          id="destaque-titulo"
          className="marquise mt-4 max-w-[16ch] text-balance text-4xl text-texto [text-shadow:0_4px_30px_rgba(0,0,0,0.75)] sm:text-6xl lg:text-7xl"
        >
          {filme.titulo}
        </h2>

        <p className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm tabular-nums text-texto-fraco">
          <span className="font-semibold text-texto">{filme.nota.toFixed(1)}</span>
          <span aria-hidden="true">·</span>
          <span>{filme.votos.toLocaleString('pt-BR')} votos</span>
          {filme.ano !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>{filme.ano}</span>
            </>
          )}
        </p>

        {filme.sinopse && (
          <p className="mt-4 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-texto-fraco sm:text-base">
            {filme.sinopse}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={`/filme/${filme.id}`}
            className="inline-flex items-center gap-2 rounded-sm bg-texto px-6 py-3 text-sm font-bold text-fundo transition-colors hover:bg-white"
          >
            <IconeInfo />
            Ver detalhes
          </Link>
          <BotaoWatchlist
            filme={{ id: filme.id, titulo: filme.titulo, poster: filme.poster }}
            variante="destaque"
          />
        </div>
      </div>
    </section>
  )
}
