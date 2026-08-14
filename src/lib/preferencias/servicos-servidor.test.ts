import { beforeEach, describe, expect, it, vi } from 'vitest'
import { escolheuServicos, lerServicosDoCookie } from '@/lib/preferencias/servicos-servidor'

const { estado } = vi.hoisted(() => ({ estado: { valor: undefined as string | undefined } }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === 'servicos' && estado.valor !== undefined
        ? { name: nome, value: estado.valor }
        : undefined,
  }),
}))

describe('servicos-servidor', () => {
  beforeEach(() => {
    estado.valor = undefined
  })

  it('diz que ninguém escolheu quando o cookie não existe', async () => {
    expect(await escolheuServicos()).toBe(false)
  })

  it('considera escolha feita mesmo com cookie vazio', async () => {
    estado.valor = ''
    expect(await escolheuServicos()).toBe(true)
    expect(await lerServicosDoCookie()).toEqual([])
  })

  it('lê os ids do cookie', async () => {
    estado.valor = '8,119'
    expect(await lerServicosDoCookie()).toEqual([8, 119])
  })
})
