import { z } from 'zod'
import type { Filtros } from '@/lib/tipos'
import { filtrarCurados } from '@/lib/servicos/populares'
import {
  esquemaAno,
  esquemaDuracao,
  esquemaNota,
  esquemaOrdenacao,
  esquemaPagina,
} from './esquema'

export type ParamsBrutos = Record<string, string | string[] | undefined>

export const FILTROS_PADRAO: Filtros = {
  servicos: [],
  generos: [],
  notaMinima: null,
  duracaoMaxMin: null,
  anoDe: null,
  anoAte: null,
  ordenacao: 'popularidade',
  pagina: 1,
}

const primeiro = (valor: string | string[] | undefined): string | undefined =>
  Array.isArray(valor) ? valor[0] : valor

const lerIds = (valor: string | undefined): number[] =>
  (valor ?? '')
    .split(',')
    .map((parte) => Number(parte.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)

const lerNumero = (valor: string | undefined, esquema: z.ZodNumber): number | null => {
  if (valor === undefined || valor.trim() === '') return null
  const resultado = esquema.safeParse(Number(valor))
  return resultado.success ? resultado.data : null
}

export function lerFiltros(params: ParamsBrutos, servicosPadrao: number[]): Filtros {
  const bruto = (chave: string) => primeiro(params[chave])
  const servicos = bruto('servicos')
  const escolhidos =
    servicos === undefined ? servicosPadrao : servicos === 'todos' ? [] : lerIds(servicos)

  return {
    // Único funil por onde URL e cookie viram Filtros, e por isso o único lugar
    // que precisa peneirar: um id fora do roster não tem caixa na barra, e
    // deixá-lo passar daria um filtro ativo que o usuário não consegue desligar.
    servicos: filtrarCurados(escolhidos),
    generos: lerIds(bruto('generos')),
    notaMinima: lerNumero(bruto('nota'), esquemaNota),
    duracaoMaxMin: lerNumero(bruto('duracao'), esquemaDuracao),
    anoDe: lerNumero(bruto('de'), esquemaAno),
    anoAte: lerNumero(bruto('ate'), esquemaAno),
    ordenacao: esquemaOrdenacao.catch('popularidade').parse(bruto('ordem')),
    pagina: lerNumero(bruto('pagina'), esquemaPagina) ?? 1,
  }
}
