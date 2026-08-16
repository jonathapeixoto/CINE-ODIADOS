import { describe, expect, it } from 'vitest'
import {
  SERVICOS_POPULARES,
  ehServicoCurado,
  filtrarCurados,
  idsParaFiltro,
} from '@/lib/servicos/populares'

describe('SERVICOS_POPULARES', () => {
  it('tem os serviços de peso do Brasil', () => {
    expect(SERVICOS_POPULARES.map((s) => s.rotulo)).toEqual([
      'Netflix',
      'Prime Video',
      'Max',
      'Disney+',
      'Globoplay',
      'Apple TV+',
      'Paramount+',
      'Telecine',
      'Crunchyroll',
      'Claro tv+',
      'Looke',
      'Pluto TV',
      'MUBI',
    ])
  })

  it('nunca repete um id entre serviços', () => {
    // Um id em duas entradas faria dois serviços diferentes acenderem juntos na
    // barra, e idsParaFiltro mandaria o mesmo provedor duas vezes ao TMDB.
    const todos = SERVICOS_POPULARES.flatMap((s) => [s.principal, ...s.apelidos])
    expect(new Set(todos).size).toBe(todos.length)
  })
})

describe('ehServicoCurado', () => {
  it('reconhece um principal do roster', () => {
    expect(ehServicoCurado(8)).toBe(true)
  })

  it('recusa provedor de nicho', () => {
    expect(ehServicoCurado(692)).toBe(false)
  })

  it('recusa apelido: apelido não é serviço marcável', () => {
    // 1796 é a entrada "Netflix Standard with Ads". Ela entra no filtro junto
    // com a Netflix, mas não tem caixa própria na barra.
    expect(ehServicoCurado(1796)).toBe(false)
  })
})

describe('filtrarCurados', () => {
  it('descarta o que está fora do roster e preserva a ordem', () => {
    expect(filtrarCurados([692, 8, 1796, 337])).toEqual([8, 337])
  })

  it('devolve lista vazia sem reclamar', () => {
    expect(filtrarCurados([])).toEqual([])
  })
})

describe('idsParaFiltro', () => {
  it('expande cada serviço nos seus apelidos', () => {
    expect(idsParaFiltro([8, 119])).toEqual([8, 1796, 119, 2100])
  })

  it('segue a ordem do roster, não a da entrada', () => {
    // Determinismo: with_watch_providers é um OU, então a ordem não muda o
    // resultado da API, mas muda o que os testes precisam esperar.
    expect(idsParaFiltro([119, 8])).toEqual([8, 1796, 119, 2100])
  })

  it('ignora id que não é principal de nenhum serviço', () => {
    expect(idsParaFiltro([692, 1796])).toEqual([])
  })
})
