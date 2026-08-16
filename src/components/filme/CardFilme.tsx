import Image from 'next/image'
import Link from 'next/link'
import type { Filme } from '@/lib/tipos'

function IconeSemPoster() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-8 w-8 opacity-60"
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

export function CardFilme({ filme, prioridade = false }: { filme: Filme; prioridade?: boolean }) {
  return (
    <Link href={`/filme/${filme.id}`} className="group block">
      {/* O quadro tem tamanho fixo e a imagem cresce dentro dele: o hover
          aproxima o pôster sem empurrar os vizinhos de lugar. */}
      <div className="relative overflow-hidden rounded-sm bg-superficie ring-1 ring-borda transition duration-300 group-hover:ring-acento group-hover:shadow-[0_20px_45px_-15px_rgba(0,0,0,0.95)] motion-safe:group-hover:-translate-y-1">
        {filme.poster ? (
          <Image
            src={filme.poster}
            alt={filme.titulo}
            width={342}
            height={513}
            sizes="(min-width: 1536px) 14vw, (min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 640px) 25vw, 45vw"
            priority={prioridade}
            className="h-auto w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.06]"
          />
        ) : (
          <div
            role="presentation"
            className="flex aspect-[2/3] flex-col items-center justify-center gap-2 text-texto-fraco"
          >
            <IconeSemPoster />
            <span className="text-xs">Sem pôster</span>
          </div>
        )}
      </div>
      <h3 className="mt-2.5 truncate text-[13px] font-medium text-texto transition-colors group-hover:text-acento">
        {filme.titulo}
      </h3>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-texto-fraco">
        <span className="font-semibold text-texto">{filme.nota.toFixed(1)}</span>
        {filme.ano !== null && (
          <>
            <span aria-hidden="true">·</span>
            <span>{filme.ano}</span>
          </>
        )}
      </p>
    </Link>
  )
}
