import 'server-only'
import { BASE_TMDB_PADRAO, IDIOMA } from '@/lib/constantes'

export class ErroTmdb extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroTmdb'
  }
}

export const ESPERAS_MS = [300, 900] as const

export type OpcoesBusca = {
  revalidate: number
  esperar?: (ms: number) => Promise<void>
}

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

export async function buscarTmdb<T>(
  caminho: string,
  params: Record<string, string>,
  opcoes: OpcoesBusca,
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN
  if (!token) {
    throw new ErroTmdb(500, 'TMDB_READ_TOKEN não configurado. Veja o .env.example.')
  }

  // O caminho já começa com "/", então uma barra sobrando na variável de
  // ambiente viraria ".../3//discover/movie".
  const base = (process.env.TMDB_BASE_URL || BASE_TMDB_PADRAO).replace(/\/+$/, '')
  const url = new URL(`${base}${caminho}`)
  url.searchParams.set('language', IDIOMA)
  for (const [chave, valor] of Object.entries(params)) url.searchParams.set(chave, valor)

  const esperar = opcoes.esperar ?? dormir

  for (let tentativa = 0; ; tentativa += 1) {
    const resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      next: { revalidate: opcoes.revalidate },
    })

    if (resposta.ok) return (await resposta.json()) as T

    if (resposta.status === 429 && tentativa < ESPERAS_MS.length) {
      await esperar(ESPERAS_MS[tentativa])
      continue
    }

    throw new ErroTmdb(resposta.status, `TMDB respondeu ${resposta.status} em ${caminho}`)
  }
}
