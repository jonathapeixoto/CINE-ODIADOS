import 'server-only'
import { cookies } from 'next/headers'
import { COOKIE_SERVICOS, decodificarServicos } from './servicos'

/** Lista vazia significa "ainda não escolheu" ou "todos". Quem precisa distinguir usa escolheuServicos. */
export async function lerServicosDoCookie(): Promise<number[]> {
  const cookieStore = await cookies()
  return decodificarServicos(cookieStore.get(COOKIE_SERVICOS)?.value)
}

export async function escolheuServicos(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_SERVICOS) !== undefined
}
