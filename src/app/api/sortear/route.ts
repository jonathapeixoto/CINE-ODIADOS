import { lerFiltros } from '@/lib/filtros'
import { lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { escolherAlvo, itensNaUltimaPagina } from '@/lib/sorteio'
import { descobrirFilmes } from '@/lib/tmdb'
import { ErroTmdb } from '@/lib/tmdb/cliente'

export async function GET(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filtros = lerFiltros(params, await lerServicosDoCookie())

  try {
    const primeira = await descobrirFilmes({ ...filtros, pagina: 1 })
    const alvo = escolherAlvo(
      primeira.totalPaginas,
      itensNaUltimaPagina(primeira.totalResultados, primeira.totalPaginas),
      Math.random,
    )

    if (alvo === null) return Response.json({ filme: null })

    const pagina =
      alvo.pagina === 1 ? primeira : await descobrirFilmes({ ...filtros, pagina: alvo.pagina })

    return Response.json({ filme: pagina.filmes[alvo.indice] ?? pagina.filmes[0] ?? null })
  } catch (erro) {
    const status = erro instanceof ErroTmdb ? erro.status : 500
    return Response.json({ erro: 'Não consegui sortear agora.' }, { status })
  }
}
