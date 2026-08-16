'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { escreverFiltros } from '@/lib/filtros'
import { salvarServicos } from '@/lib/preferencias/servicos-cliente'
import type { Filtros, Genero, Provedor } from '@/lib/tipos'
import { SERVICOS_NA_BARRA, provedoresVisiveis } from './provedores-visiveis'

const NOTAS = [6, 7, 8]
const DURACOES = [90, 120, 150]
const ORDENS: { valor: Filtros['ordenacao']; rotulo: string }[] = [
  { valor: 'popularidade', rotulo: 'Mais populares' },
  { valor: 'nota', rotulo: 'Melhor avaliados' },
  { valor: 'lancamento', rotulo: 'Mais recentes' },
]

// anoDe/anoAte são um par: a década é a unidade que faz sentido escolher, e um
// único select escreve os dois de uma vez.
const PERIODOS: { valor: string; rotulo: string; anoDe: number | null; anoAte: number | null }[] = [
  { valor: '', rotulo: 'Qualquer', anoDe: null, anoAte: null },
  { valor: '2020', rotulo: '2020 em diante', anoDe: 2020, anoAte: null },
  { valor: '2010', rotulo: 'Anos 2010', anoDe: 2010, anoAte: 2019 },
  { valor: '2000', rotulo: 'Anos 2000', anoDe: 2000, anoAte: 2009 },
  { valor: '1990', rotulo: 'Anos 1990', anoDe: 1990, anoAte: 1999 },
  { valor: 'antigos', rotulo: 'Antes de 1990', anoDe: null, anoAte: 1989 },
]

const PERIODO_LIVRE = 'personalizado'

// A URL aceita qualquer par de anos (zod só valida o intervalo), então pode
// chegar aqui um recorte que não é nenhuma das décadas. Mostrar "Qualquer"
// nesse caso seria mentir sobre um filtro que está valendo.
const valorDoPeriodo = (filtros: Filtros): string =>
  PERIODOS.find((p) => p.anoDe === filtros.anoDe && p.anoAte === filtros.anoAte)?.valor ??
  PERIODO_LIVRE

const alternar = (lista: number[], id: number): number[] =>
  lista.includes(id) ? lista.filter((i) => i !== id) : [...lista, id]

const nomesDe = (lista: number[], catalogo: { id: number; nome: string }[]): string[] =>
  lista.map((id) => catalogo.find((item) => item.id === id)?.nome).filter((n): n is string => !!n)

/**
 * O painel fica fechado, então a linha precisa dizer sozinha o que está
 * ligado — senão o usuário teria que abrir o menu só para lembrar por que a
 * grade está daquele jeito. A contagem no botão diz "quantos"; este resumo
 * diz "quais".
 */
function resumir(filtros: Filtros, provedores: Provedor[], generos: Genero[]): string {
  const periodo = valorDoPeriodo(filtros)
  const partes = [
    ...nomesDe(filtros.servicos, provedores),
    ...nomesDe(filtros.generos, generos),
    filtros.notaMinima !== null ? `nota ${filtros.notaMinima}+` : null,
    filtros.duracaoMaxMin !== null ? `até ${filtros.duracaoMaxMin} min` : null,
    // Um recorte de anos que não é nenhuma das décadas não tem rótulo pronto;
    // escrever o intervalo é melhor do que omitir um filtro que está valendo.
    periodo === PERIODO_LIVRE
      ? `${filtros.anoDe ?? '…'} a ${filtros.anoAte ?? '…'}`
      : (PERIODOS.find((p) => p.valor === periodo)?.rotulo ?? null),
  ].filter((p): p is string => p !== null && p !== 'Qualquer')

  return partes.length === 0 ? 'Tudo o que está no catálogo' : partes.join(' · ')
}

// Chip de seleção (serviço/gênero): o checkbox real fica visível — herda o
// contorno de foco global e o realce ":checked" nativo sem precisar duplicar
// nenhum dos dois à mão.
const classeChip =
  'inline-flex cursor-pointer items-center gap-2 rounded-sm border border-borda bg-superficie ' +
  'px-3 py-1.5 text-sm text-texto-fraco transition-colors has-[:checked]:border-acento ' +
  'has-[:checked]:bg-acento/15 has-[:checked]:text-acento hover:border-texto-fraco hover:text-texto'

const classeRotulo = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-texto-fraco'

const classeSelect =
  'w-full rounded-sm border border-borda bg-superficie px-3 py-2 text-sm text-texto ' +
  'transition-colors hover:border-texto-fraco'

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
  const [todosOsServicos, setTodosOsServicos] = useState(false)
  const raizRef = useRef<HTMLElement>(null)

  // O painel cobre a grade em vez de empurrá-la, então precisa fechar como
  // qualquer menu suspenso: com Esc ou com um clique fora dele.
  useEffect(() => {
    if (!aberto) return

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false)
    }
    const aoApontar = (evento: PointerEvent) => {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false)
    }

    document.addEventListener('keydown', aoTeclar)
    document.addEventListener('pointerdown', aoApontar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('pointerdown', aoApontar)
    }
  }, [aberto])

  const servicosNaTela = todosOsServicos
    ? provedores
    : provedoresVisiveis(provedores, filtros.servicos, SERVICOS_NA_BARRA)
  const escondidos = provedores.length - servicosNaTela.length

  // Mexer em qualquer filtro volta para a página 1: manter a página antiga
  // deixaria a tela vazia sem motivo aparente.
  const aplicar = (mudanca: Partial<Filtros>) => {
    const novos = { ...filtros, ...mudanca, pagina: 1 }

    // Esta barra é a superfície de edição dos serviços assinados (§3 do
    // design: "primeira visita e depois editável"). Sem gravar o cookie, a
    // troca valeria só para a URL atual e voltar para "/" — o que o wordmark do
    // app faz — ressuscitaria a escolha da primeira visita. Lista vazia também
    // é escolha: escolheuServicos olha a presença do cookie, não o conteúdo.
    if (mudanca.servicos !== undefined) salvarServicos(novos.servicos)

    router.push(`/?${escreverFiltros(novos).toString()}`, { scroll: false })
  }

  const periodoAtual = valorDoPeriodo(filtros)

  const totalAtivos =
    filtros.servicos.length +
    filtros.generos.length +
    (filtros.notaMinima !== null ? 1 : 0) +
    (filtros.duracaoMaxMin !== null ? 1 : 0) +
    (filtros.anoDe !== null || filtros.anoAte !== null ? 1 : 0)

  return (
    <section aria-label="Filtros" ref={raizRef} className="relative">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls="barra-filtros-painel"
          onClick={() => setAberto((v) => !v)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-sm border px-3.5 py-2 text-sm font-semibold transition-colors ${
            aberto
              ? 'border-texto-fraco bg-superficie-alta text-texto'
              : 'border-borda bg-superficie text-texto hover:border-texto-fraco'
          }`}
        >
          <IconeSliders />
          Filtros
          {totalAtivos > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-acento px-1 text-[11px] font-bold tabular-nums text-acento-texto">
              {totalAtivos}
            </span>
          )}
          <IconeChevron aberto={aberto} />
        </button>

        <p className="min-w-0 truncate text-[13px] text-texto-fraco">
          {resumir(filtros, provedores, generos)}
        </p>
      </div>

      {/* O painel é sobreposto, não empilhado: abrir um menu não pode empurrar
          a grade que ele filtra para fora da tela. */}
      <div
        id="barra-filtros-painel"
        className={`${
          aberto ? 'flex' : 'hidden'
        } absolute inset-x-0 top-full z-30 mt-2 max-h-[70vh] flex-col gap-6 overflow-y-auto rounded-md border border-borda bg-superficie-alta p-5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.95)] sm:p-6`}
      >
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className={classeRotulo}>Serviços</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {servicosNaTela.map((provedor) => (
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
            {(todosOsServicos || escondidos > 0) && (
              <button
                type="button"
                aria-expanded={todosOsServicos}
                onClick={() => setTodosOsServicos((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-borda px-3 py-1.5 text-sm text-texto-fraco transition-colors hover:border-texto-fraco hover:text-texto"
              >
                {todosOsServicos ? 'Menos serviços' : `Mais ${escondidos} serviços`}
                <IconeChevron aberto={todosOsServicos} className="h-3 w-3" />
              </button>
            )}
          </div>
        </fieldset>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className={classeRotulo}>Gêneros</legend>
          <div className="mt-3 flex flex-wrap gap-2">
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <span className={classeRotulo}>Período</span>
            <select
              className={classeSelect}
              value={periodoAtual}
              onChange={(evento) => {
                const escolhido = PERIODOS.find((p) => p.valor === evento.target.value)
                if (escolhido) aplicar({ anoDe: escolhido.anoDe, anoAte: escolhido.anoAte })
              }}
            >
              {PERIODOS.map((periodo) => (
                <option key={periodo.valor} value={periodo.valor}>
                  {periodo.rotulo}
                </option>
              ))}
              {periodoAtual === PERIODO_LIVRE && (
                <option value={PERIODO_LIVRE} disabled>
                  {filtros.anoDe ?? '…'} a {filtros.anoAte ?? '…'}
                </option>
              )}
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
