import { lerFiltros } from '@/lib/filtros'
import { lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'
import { descobrirFilmes } from '@/lib/tmdb'
import { ErroTmdb } from '@/lib/tmdb/cliente'

export async function GET(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filtros = lerFiltros(params, await lerServicosDoCookie())

  try {
    return Response.json(await descobrirFilmes(filtros))
  } catch (erro) {
    const status = erro instanceof ErroTmdb ? erro.status : 500
    return Response.json({ erro: 'Não consegui falar com o TMDB agora.' }, { status })
  }
}
