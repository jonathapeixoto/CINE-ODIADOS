import { z } from 'zod'
import { MAX_PAGINAS } from '@/lib/constantes'

export const esquemaNota = z.number().min(0).max(10)
export const esquemaDuracao = z.number().int().min(1).max(600)
export const esquemaAno = z.number().int().min(1874).max(2100)
export const esquemaPagina = z.number().int().min(1).max(MAX_PAGINAS)
export const esquemaOrdenacao = z.enum(['popularidade', 'nota', 'lancamento'])
