import type { ItemWatchlist } from '@/lib/tipos'

export const CHAVE_WATCHLIST = 'watchlist'

const ehItem = (valor: unknown): valor is ItemWatchlist =>
  typeof valor === 'object' && valor !== null && typeof (valor as ItemWatchlist).id === 'number'

export function lerWatchlist(): ItemWatchlist[] {
  if (typeof window === 'undefined') return []
  try {
    const cru: unknown = JSON.parse(localStorage.getItem(CHAVE_WATCHLIST) ?? '[]')
    return Array.isArray(cru) ? cru.filter(ehItem) : []
  } catch {
    return []
  }
}

function salvar(itens: ItemWatchlist[]): ItemWatchlist[] {
  localStorage.setItem(CHAVE_WATCHLIST, JSON.stringify(itens))
  return itens
}

export function alternarWatchlist(item: ItemWatchlist): ItemWatchlist[] {
  const atual = lerWatchlist()
  if (atual.some((i) => i.id === item.id)) {
    return salvar(atual.filter((i) => i.id !== item.id))
  }
  return salvar([...atual, { id: item.id, titulo: item.titulo, poster: item.poster }])
}

export const estaNaWatchlist = (id: number): boolean => lerWatchlist().some((i) => i.id === id)
