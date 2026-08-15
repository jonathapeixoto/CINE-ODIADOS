import { beforeEach, describe, expect, it } from 'vitest'
import {
  CHAVE_WATCHLIST,
  alternarWatchlist,
  codificarServicos,
  decodificarServicos,
  estaNaWatchlist,
  lerWatchlist,
} from '@/lib/preferencias'

describe('cookie de serviços', () => {
  it('codifica ids como lista separada por vírgula', () => {
    expect(codificarServicos([8, 119])).toBe('8,119')
  })

  it('decodifica ignorando lixo', () => {
    expect(decodificarServicos('8,abc,,119')).toEqual([8, 119])
  })

  it('devolve lista vazia quando o cookie não existe', () => {
    expect(decodificarServicos(undefined)).toEqual([])
  })
})

describe('watchlist', () => {
  const filme = { id: 27205, titulo: 'A Origem', poster: null }

  beforeEach(() => localStorage.clear())

  it('começa vazia', () => {
    expect(lerWatchlist()).toEqual([])
  })

  it('adiciona e remove alternando o mesmo filme', () => {
    expect(alternarWatchlist(filme)).toEqual([filme])
    expect(lerWatchlist()).toEqual([filme])
    expect(estaNaWatchlist(27205)).toBe(true)

    expect(alternarWatchlist(filme)).toEqual([])
    expect(estaNaWatchlist(27205)).toBe(false)
  })

  it('guarda só id, título e pôster', () => {
    alternarWatchlist({ ...filme, extra: 'ignorado' } as never)
    expect(Object.keys(lerWatchlist()[0]).sort()).toEqual(['id', 'poster', 'titulo'])
  })

  it('sobrevive a conteúdo corrompido no localStorage', () => {
    localStorage.setItem(CHAVE_WATCHLIST, '{isso não é json}')
    expect(lerWatchlist()).toEqual([])
  })

  it('descarta um valor que não seja lista', () => {
    localStorage.setItem(CHAVE_WATCHLIST, '{"id":1}')
    expect(lerWatchlist()).toEqual([])
  })

  it('descarta um item da lista sem título', () => {
    localStorage.setItem(CHAVE_WATCHLIST, '[{"id":1}]')
    expect(lerWatchlist()).toEqual([])
  })
})
