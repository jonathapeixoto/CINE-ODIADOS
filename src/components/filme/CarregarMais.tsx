'use client'
import { useState } from 'react'
import { GradeFilmes } from './GradeFilmes'
import { escreverFiltros } from '@/lib/filtros'
import type { Filme, Filtros } from '@/lib/tipos'

export function CarregarMais({
  filtros,
  paginaAtual,
  totalPaginas,
}: {
  filtros: Filtros
  paginaAtual: number
  totalPaginas: number
}) {
  const [extras, setExtras] = useState<Filme[]>([])
  const [ultimaPagina, setUltimaPagina] = useState(paginaAtual)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)

  const acabou = ultimaPagina >= totalPaginas

  const carregar = async () => {
    setCarregando(true)
    setErro(false)
    const proxima = ultimaPagina + 1
    const params = escreverFiltros({ ...filtros, pagina: proxima })

    try {
      const resposta = await fetch(`/api/descobrir?${params.toString()}`)
      if (!resposta.ok) throw new Error('falhou')
      const dados = (await resposta.json()) as { filmes: Filme[] }
      setExtras((atuais) => [...atuais, ...dados.filmes])
      setUltimaPagina(proxima)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      {extras.length > 0 && (
        <div className="mt-8">
          <GradeFilmes filmes={extras} />
        </div>
      )}

      {!acabou && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          {erro && (
            <p role="alert" className="text-sm text-texto">
              Não consegui carregar mais filmes. Tente de novo.
            </p>
          )}
          <button
            type="button"
            onClick={carregar}
            disabled={carregando}
            className="inline-flex items-center gap-2 rounded-full bg-acento px-6 py-2.5 text-sm font-semibold text-acento-texto transition-colors hover:bg-acento-forte disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-acento-texto/40 border-t-acento-texto"
              />
            )}
            {carregando ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  )
}
