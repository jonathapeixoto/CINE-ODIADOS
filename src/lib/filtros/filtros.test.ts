import { describe, expect, it } from 'vitest'
import { FILTROS_PADRAO, escreverFiltros, lerFiltros, paraQueryTmdb } from '@/lib/filtros'

describe('lerFiltros', () => {
  it('usa os serviços do cookie quando a URL não traz o parâmetro', () => {
    expect(lerFiltros({}, [8, 119]).servicos).toEqual([8, 119])
  })

  it('trata servicos=todos como ausência de filtro de provedor', () => {
    expect(lerFiltros({ servicos: 'todos' }, [8]).servicos).toEqual([])
  })

  it('lê listas de ids separadas por vírgula', () => {
    const f = lerFiltros({ servicos: '8,119', generos: '35,28' }, [])
    expect(f.servicos).toEqual([8, 119])
    expect(f.generos).toEqual([35, 28])
  })

  it('descarta ids inválidos em vez de quebrar', () => {
    expect(lerFiltros({ servicos: '8,abc,-3,0,119' }, []).servicos).toEqual([8, 119])
  })

  it('cai no padrão quando um valor escalar é inválido', () => {
    const f = lerFiltros({ nota: '99', duracao: 'x', ordem: 'aleatoria', pagina: '0' }, [])
    expect(f.notaMinima).toBeNull()
    expect(f.duracaoMaxMin).toBeNull()
    expect(f.ordenacao).toBe('popularidade')
    expect(f.pagina).toBe(1)
  })

  it('limita a página ao teto de 500 do TMDB', () => {
    expect(lerFiltros({ pagina: '700' }, []).pagina).toBe(1)
    expect(lerFiltros({ pagina: '500' }, []).pagina).toBe(500)
  })

  it('aceita o primeiro valor quando o parâmetro vem repetido', () => {
    expect(lerFiltros({ nota: ['7', '9'] }, []).notaMinima).toBe(7)
  })
})

describe('escreverFiltros', () => {
  it('sempre emite servicos para o cookie não reassumir o controle', () => {
    expect(escreverFiltros({ ...FILTROS_PADRAO }).get('servicos')).toBe('todos')
    expect(escreverFiltros({ ...FILTROS_PADRAO, servicos: [8, 119] }).get('servicos')).toBe('8,119')
  })

  it('omite os valores que estão no padrão', () => {
    const p = escreverFiltros({ ...FILTROS_PADRAO })
    expect(p.get('nota')).toBeNull()
    expect(p.get('ordem')).toBeNull()
    expect(p.get('pagina')).toBeNull()
  })

  it('faz a volta completa URL -> filtros -> URL', () => {
    const original = { ...FILTROS_PADRAO, servicos: [8], generos: [35], notaMinima: 7, pagina: 3 }
    expect(lerFiltros(Object.fromEntries(escreverFiltros(original)), [])).toEqual(original)
  })
})

describe('paraQueryTmdb', () => {
  it('expande os apelidos do serviço marcado e cobra só o que já está pago', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, servicos: [8, 119] })
    expect(q.watch_region).toBe('BR')
    // 1796 e 2100 são as entradas "with Ads" dos mesmos dois serviços no TMDB.
    expect(q.with_watch_providers).toBe('8|1796|119|2100')
    // Quem marcou "eu assino Netflix" não quer ver que pode alugar por R$ 19,90.
    expect(q.with_watch_monetization_types).toBe('flatrate|free|ads')
  })

  it('mantém o portão de disponibilidade quando nenhum serviço foi escolhido', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO })
    expect(q.watch_region).toBe('BR')
    expect(q.with_watch_providers).toBeUndefined()
    expect(q.with_watch_monetization_types).toBe('flatrate|free|ads|rent|buy')
  })

  it('abre o portão quando só sobram serviços fora do allowlist', () => {
    // Rede de segurança: with_watch_providers vazio faria o TMDB devolver zero
    // resultado, e a home ficaria vazia sem explicação.
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, servicos: [692] })
    expect(q.with_watch_providers).toBeUndefined()
    expect(q.with_watch_monetization_types).toBe('flatrate|free|ads|rent|buy')
  })

  it('une gêneros com E lógico', () => {
    expect(paraQueryTmdb({ ...FILTROS_PADRAO, generos: [35, 28] }).with_genres).toBe('35,28')
  })

  it('aplica o piso de votos quando há nota mínima', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, notaMinima: 7 })
    expect(q['vote_average.gte']).toBe('7')
    expect(q['vote_count.gte']).toBe('100')
  })

  it('aplica o piso de votos também ao ordenar por nota', () => {
    expect(paraQueryTmdb({ ...FILTROS_PADRAO, ordenacao: 'nota' })['vote_count.gte']).toBe('100')
  })

  it('traduz duração e período', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, duracaoMaxMin: 120, anoDe: 1990, anoAte: 1999 })
    expect(q['with_runtime.lte']).toBe('120')
    expect(q['primary_release_date.gte']).toBe('1990-01-01')
    expect(q['primary_release_date.lte']).toBe('1999-12-31')
  })

  it('não deixa lançamentos futuros entrarem na ordenação por lançamento', () => {
    const q = paraQueryTmdb({ ...FILTROS_PADRAO, ordenacao: 'lancamento' }, new Date('2026-08-13T00:00:00Z'))
    expect(q.sort_by).toBe('primary_release_date.desc')
    expect(q['primary_release_date.lte']).toBe('2026-08-13')
  })

  it('nunca pede página acima do teto', () => {
    expect(paraQueryTmdb({ ...FILTROS_PADRAO, pagina: 900 }).page).toBe('500')
  })
})
