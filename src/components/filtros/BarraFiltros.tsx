'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { escreverFiltros } from '@/lib/filtros'
import type { Filtros, Genero, Provedor } from '@/lib/tipos'

const NOTAS = [6, 7, 8]
const DURACOES = [90, 120, 150]
const ORDENS: { valor: Filtros['ordenacao']; rotulo: string }[] = [
  { valor: 'popularidade', rotulo: 'Mais populares' },
  { valor: 'nota', rotulo: 'Melhor avaliados' },
  { valor: 'lancamento', rotulo: 'Mais recentes' },
]

const alternar = (lista: number[], id: number): number[] =>
  lista.includes(id) ? lista.filter((i) => i !== id) : [...lista, id]

// Chip de seleção (serviço/gênero): o checkbox real fica visível — herda o
// contorno de foco global e o realce ":checked" nativo sem precisar duplicar
// nenhum dos dois à mão.
const classeChip =
  'inline-flex cursor-pointer items-center gap-2 rounded-full border border-borda bg-superficie-alta ' +
  'px-3 py-1.5 text-sm text-texto-fraco transition-colors has-[:checked]:border-acento ' +
  'has-[:checked]:bg-acento/15 has-[:checked]:text-acento hover:border-acento/60 hover:text-texto'

const classeRotulo = 'text-xs font-semibold uppercase tracking-wider text-texto-fraco'

const classeSelect =
  'w-full rounded-lg border border-borda bg-superficie-alta px-3 py-2 text-sm text-texto ' +
  'transition-colors hover:border-acento/60'

function IconeSliders() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="14" cy="7" r="2.25" />
      <circle cx="8" cy="17" r="2.25" />
    </svg>
  )
}

function IconeChevron({ aberto, className = 'h-3.5 w-3.5' }: { aberto: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`transition-transform ${aberto ? 'rotate-180' : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function BarraFiltros({
  filtros,
  provedores,
  generos,
}: {
  filtros: Filtros
  provedores: Provedor[]
  generos: Genero[]
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)

  // Mexer em qualquer filtro volta para a página 1: manter a página antiga
  // deixaria a tela vazia sem motivo aparente.
  const aplicar = (mudanca: Partial<Filtros>) => {
    const novos = { ...filtros, ...mudanca, pagina: 1 }
    router.push(`/?${escreverFiltros(novos).toString()}`, { scroll: false })
  }

  const totalAtivos =
    filtros.servicos.length +
    filtros.generos.length +
    (filtros.notaMinima !== null ? 1 : 0) +
    (filtros.duracaoMaxMin !== null ? 1 : 0)

  return (
    <section
      aria-label="Filtros"
      className="sticky top-[var(--altura-cabecalho)] z-[9] rounded-2xl border border-borda bg-superficie/95 px-4 py-3 shadow-lg shadow-fundo/40 backdrop-blur sm:px-5 sm:py-4"
    >
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="barra-filtros-painel"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 sm:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-texto">
          <IconeSliders />
          Filtros
          {totalAtivos > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-acento px-1 font-mono text-[11px] font-bold text-acento-texto">
              {totalAtivos}
            </span>
          )}
        </span>
        <IconeChevron aberto={aberto} />
      </button>

      <div
        id="barra-filtros-painel"
        className={`${aberto ? 'mt-4 flex' : 'hidden'} flex-col gap-5 sm:mt-0 sm:flex sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6 sm:gap-y-4`}
      >
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className={classeRotulo}>Serviços</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {provedores.map((provedor) => (
              <label key={provedor.id} className={classeChip}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-acento"
                  checked={filtros.servicos.includes(provedor.id)}
                  onChange={() => aplicar({ servicos: alternar(filtros.servicos, provedor.id) })}
                />
                {provedor.nome}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className={classeRotulo}>Gêneros</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {generos.map((genero) => (
              <label key={genero.id} className={classeChip}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-acento"
                  checked={filtros.generos.includes(genero.id)}
                  onChange={() => aplicar({ generos: alternar(filtros.generos, genero.id) })}
                />
                {genero.nome}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-4 sm:ml-auto">
          <label className="flex flex-col gap-1.5">
            <span className={classeRotulo}>Nota mínima</span>
            <select
              className={classeSelect}
              value={filtros.notaMinima ?? ''}
              onChange={(evento) =>
                aplicar({ notaMinima: evento.target.value === '' ? null : Number(evento.target.value) })
              }
            >
              <option value="">Qualquer</option>
              {NOTAS.map((nota) => (
                <option key={nota} value={nota}>
                  {nota} ou mais
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={classeRotulo}>Duração máxima</span>
            <select
              className={classeSelect}
              value={filtros.duracaoMaxMin ?? ''}
              onChange={(evento) =>
                aplicar({
                  duracaoMaxMin: evento.target.value === '' ? null : Number(evento.target.value),
                })
              }
            >
              <option value="">Qualquer</option>
              {DURACOES.map((minutos) => (
                <option key={minutos} value={minutos}>
                  até {minutos} min
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={classeRotulo}>Ordenar por</span>
            <select
              className={classeSelect}
              value={filtros.ordenacao}
              onChange={(evento) => aplicar({ ordenacao: evento.target.value as Filtros['ordenacao'] })}
            >
              {ORDENS.map((ordem) => (
                <option key={ordem.valor} value={ordem.valor}>
                  {ordem.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
