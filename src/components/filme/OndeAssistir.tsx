import Image from 'next/image'
import type { Disponibilidade, Provedor } from '@/lib/tipos'

// Mesmo vocabulário de ícone tracejado/monocromático usado no pôster ausente
// (CardFilme) e na claquete do estado vazio (EstadoVazio): uma "tela apagada"
// para dizer, sem ambiguidade, que não há sinal nenhum aqui.
function IconeSemSinal() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-8 w-8 text-texto-fraco opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 18v3" />
      <path d="M3.5 3.5l17 17" />
    </svg>
  )
}

function IconeAbrirLink() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  )
}

function Grupo({ titulo, provedores }: { titulo: string; provedores: Provedor[] }) {
  if (provedores.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-texto-fraco">{titulo}</h3>
      <ul className="mt-2.5 flex flex-wrap gap-2.5">
        {provedores.map((provedor) => (
          <li key={provedor.id}>
            {provedor.logo === null ? (
              // Sem imagem no TMDB: o nome ocupa o lugar do logo, no mesmo
              // gabarito, com a borda tracejada dos demais espaços reservados.
              <span
                title={provedor.nome}
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-dashed border-borda px-1 text-center text-[10px] leading-tight text-texto-fraco"
              >
                {provedor.nome}
              </span>
            ) : (
              <Image
                src={provedor.logo}
                alt={provedor.nome}
                title={provedor.nome}
                width={48}
                height={48}
                className="rounded-xl ring-1 ring-borda"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OndeAssistir({ disponibilidade }: { disponibilidade: Disponibilidade }) {
  const vazio =
    disponibilidade.assinatura.length === 0 &&
    disponibilidade.aluguel.length === 0 &&
    disponibilidade.compra.length === 0 &&
    disponibilidade.gratis.length === 0

  return (
    <section
      aria-labelledby="onde-assistir"
      className="rounded-3xl border border-borda bg-superficie p-6 sm:p-7"
    >
      <h2 id="onde-assistir" className="font-display text-2xl italic tracking-tight text-texto">
        Onde assistir
      </h2>

      {vazio ? (
        <div className="mt-5 flex flex-col items-center gap-3 py-6 text-center">
          <IconeSemSinal />
          <p className="max-w-xs text-sm text-texto-fraco">
            Não disponível em streaming no Brasil no momento.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <Grupo titulo="Na assinatura" provedores={disponibilidade.assinatura} />
          <Grupo titulo="De graça" provedores={disponibilidade.gratis} />
          <Grupo titulo="Para alugar" provedores={disponibilidade.aluguel} />
          <Grupo titulo="Para comprar" provedores={disponibilidade.compra} />

          {disponibilidade.linkJustWatch && (
            <a
              href={disponibilidade.linkJustWatch}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-acento px-6 py-2.5 text-sm font-semibold text-acento-texto transition-colors hover:bg-acento-forte"
            >
              Assistir no JustWatch
              <IconeAbrirLink />
            </a>
          )}
        </div>
      )}
    </section>
  )
}
