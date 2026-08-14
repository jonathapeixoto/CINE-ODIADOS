'use client'
import { COOKIE_SERVICOS, DIAS_DO_COOKIE, codificarServicos } from './servicos'

export function salvarServicos(ids: number[]): void {
  const maxAge = DIAS_DO_COOKIE * 24 * 60 * 60
  document.cookie = `${COOKIE_SERVICOS}=${codificarServicos(ids)}; path=/; max-age=${maxAge}; SameSite=Lax`
}
