'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { salvarServicos } from '@/lib/preferencias/servicos-cliente'
import type { Provedor } from '@/lib/tipos'
import { SERVICOS_NA_PRIMEIRA_VISITA, provedoresVisiveis } from './provedores-visiveis'

const alternar = (lista: number[], id: number): number[] =>
  lista.includes(id) ? lista.filter((i) => i !== id) : [...lista, id]

// Cada logo acende em carmim quando marcado — o mesmo vermelho da marca e da
// ação principal, aqui dizendo "este serviço está ligado" (ver globals.css).
const classeLampada =
  'group relative flex items-center justify-center rounded-sm border border-borda bg-superficie-alta p-3 ' +
  'transition-all hover:border-texto-fraco has-[:checked]:border-acento has-[:checked]:bg-acento/10 ' +
  'has-[:checked]:shadow-[0_0_24px_-6px_var(--color-acento)]'

export function SelecaoServicos({ provedores }: { provedores: Provedor[] }) {
  const router = useRouter()
  const [escolhidos, setEscolhidos] = useState<number[]>([])
  const [todos, setTodos] = useState(false)

  const naTela = todos
    ? provedores
    : provedoresVisiveis(provedores, escolhidos, SERVICOS_NA_PRIMEIRA_VISITA)
  const escondidos = provedores.length - naTela.length

  const confirmar = (ids: number[]) => {
    salvarServicos(ids)
    router.refresh()
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-texto sm:text-4xl">
        Quais serviços você assina?
      </h1>
      <p className="mt-3 max-w-md text-sm text-texto-fraco sm:text-base">
        Assim eu mostro só o que dá para assistir sem pagar de novo.
      </p>

      <fieldset className="mt-10 w-full min-w-0 border-0 p-0">
        <legend className="sr-only">Serviços de streaming</legend>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
          {naTela.map((provedor) => (
            <li key={provedor.id}>
              <label className={classeLampada}>
                <input
                  type="checkbox"
                  className="absolute right-2.5 top-2.5 h-3.5 w-3.5 accent-acento"
                  checked={escolhidos.includes(provedor.id)}
                  onChange={() => setEscolhidos((atual) => alternar(atual, provedor.id))}
                />
                {/* O nome vem do alt: repeti-lo num <span> faria o leitor de tela
                    anunciar "Netflix Netflix" e quebraria a busca por nome no teste.
                    Por isso o espaço reservado substitui o logo em vez de somar a
                    ele — o nome acessível da caixa de seleção é o mesmo dos dois
                    jeitos, com imagem ou sem. */}
                {provedor.logo === null ? (
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border border-dashed border-borda px-1 text-center text-[11px] leading-tight text-texto-fraco">
                    {provedor.nome}
                  </span>
                ) : (
                  <Image
                    src={provedor.logo}
                    alt={provedor.nome}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-sm object-cover"
                  />
                )}
              </label>
            </li>
          ))}
        </ul>

        {/* A lista do TMDB passa de cem serviços no Brasil. Mostrar todos de
            cara transformaria a primeira tela numa parede de logos; os de
            verdade estão no começo, já ordenados por display_priority. */}
        {(todos || escondidos > 0) && (
          <button
            type="button"
            aria-expanded={todos}
            onClick={() => setTodos((v) => !v)}
            className="mx-auto mt-6 block text-sm font-medium text-texto-fraco transition-colors hover:text-texto"
          >
            {todos ? 'Ver menos serviços' : `Ver mais ${escondidos} serviços`}
          </button>
        )}
      </fieldset>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
        <button
          type="button"
          onClick={() => confirmar(escolhidos)}
          className="rounded-sm bg-acento px-8 py-3 text-sm font-bold text-acento-texto transition-colors hover:bg-acento-forte"
        >
          Ver filmes
        </button>
        <button
          type="button"
          onClick={() => confirmar([])}
          className="text-sm font-medium text-texto-fraco transition-colors hover:text-texto"
        >
          Pular por enquanto
        </button>
      </div>
    </main>
  )
}
