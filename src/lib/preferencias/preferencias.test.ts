import { beforeEach, describe, expect, it } from 'vitest'
import {
  CHAVE_WATCHLIST,
  COOKIE_SERVICOS,
  alternarWatchlist,
  codificarServicos,
  decodificarServicos,
  estaNaWatchlist,
  lerWatchlist,
} from '@/lib/preferencias'
import { salvarServicos } from '@/lib/preferencias/servicos-cliente'

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

  // A barra de filtros grava a lista vazia quando o usuário desliga o último
  // serviço. O cookie precisa existir mesmo assim, senão a home acharia que
  // ninguém escolheu nada e mandaria de volta para a tela de primeira visita.
  it('grava um cookie presente mesmo com a lista vazia', () => {
    salvarServicos([])
    expect(document.cookie).toContain(`${COOKIE_SERVICOS}=`)
    expect(decodificarServicos('')).toEqual([])
  })

  it('grava os ids escolhidos', () => {
    salvarServicos([8, 119])
    expect(document.cookie).toContain(`${COOKIE_SERVICOS}=8,119`)
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
