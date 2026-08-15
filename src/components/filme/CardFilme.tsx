import Image from 'next/image'
import Link from 'next/link'
import type { Filme } from '@/lib/tipos'

export function CardFilme({ filme, prioridade = false }: { filme: Filme; prioridade?: boolean }) {
  return (
    <Link href={`/filme/${filme.id}`} className="group block">
      {filme.poster ? (
        <Image
          src={filme.poster}
          alt={filme.titulo}
          width={342}
          height={513}
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 45vw"
          priority={prioridade}
          className="h-auto w-full rounded-lg object-cover ring-1 ring-borda transition group-hover:ring-2 group-hover:ring-acento"
        />
      ) : (
        <div
          role="presentation"
          className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-borda bg-superficie text-texto-fraco transition group-hover:border-acento"
        >
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
          <span className="text-xs">Sem pôster</span>
        </div>
      )}
      <div className="mt-3 space-y-1">
        <h3 className="truncate font-display text-sm text-texto transition-colors group-hover:text-acento">
          {filme.titulo}
        </h3>
        <div className="flex items-center justify-between font-mono text-xs text-texto-fraco">
          {filme.ano !== null && <span>{filme.ano}</span>}
          <span className="rounded-full bg-acento/15 px-2 py-0.5 font-semibold text-acento">
            {filme.nota.toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  )
}
