import { describe, expect, it } from 'vitest'
import { ordenarPorPortugues, pontuarPortugues } from '@/lib/tmdb/portugues'
import type { FilmeCru } from '@/lib/tmdb/tipos-crus'

const cru = (extra: Partial<FilmeCru>): FilmeCru => ({
  id: 1,
  title: 'Inception',
  original_title: 'Inception',
  overview: '',
  original_language: 'en',
  ...extra,
})

describe('pontuarPortugues', () => {
  it('não dá ponto ao filme sem sinal nenhum', () => {
    expect(pontuarPortugues(cru({}))).toBe(0)
  })

  it('dá dois pontos ao filme falado em português', () => {
    expect(pontuarPortugues(cru({ original_language: 'pt' }))).toBe(2)
  })

  it('dá um ponto ao título brasileiro', () => {
    expect(pontuarPortugues(cru({ title: 'A Origem' }))).toBe(1)
  })

  it('dá um ponto à sinopse traduzida', () => {
    expect(pontuarPortugues(cru({ overview: 'Um ladrão que invade sonhos.' }))).toBe(1)
  })

  it('soma os três sinais', () => {
    const nacional = cru({
      original_language: 'pt',
      title: 'Cidade de Deus',
      original_title: 'City of God',
      overview: 'Dois meninos crescem na favela.',
    })
    expect(pontuarPortugues(nacional)).toBe(4)
  })

  it('não confunde espaço em branco com tradução', () => {
    expect(pontuarPortugues(cru({ title: '   ', overview: '  ' }))).toBe(0)
  })

  it('não dá ponto ao título quando falta o original: sem original não há como provar tradução', () => {
    expect(pontuarPortugues(cru({ title: 'A Origem', original_title: undefined }))).toBe(0)
  })
})

describe('ordenarPorPortugues', () => {
  it('põe quem tem mais sinal de português na frente', () => {
    const nenhum = cru({ id: 1 })
    const traduzido = cru({ id: 2, title: 'A Origem', overview: 'Sonhos.' })
    const nacional = cru({ id: 3, original_language: 'pt', overview: 'Dois meninos.' })

    expect(ordenarPorPortugues([nenhum, traduzido, nacional]).map((f) => f.id)).toEqual([3, 2, 1])
  })

  it('preserva a ordem do TMDB entre empatados', () => {
    // A ordenação que o usuário pediu — popularidade, nota ou lançamento —
    // continua mandando dentro de cada faixa. O desempate só desempata.
    const empatados = [cru({ id: 10 }), cru({ id: 11 }), cru({ id: 12 })]
    expect(ordenarPorPortugues(empatados).map((f) => f.id)).toEqual([10, 11, 12])
  })

  it('não modifica o array que recebeu', () => {
    const original = [cru({ id: 1 }), cru({ id: 2, original_language: 'pt' })]
    ordenarPorPortugues(original)
    expect(original.map((f) => f.id)).toEqual([1, 2])
  })

  it('mantém a ordem de entrada dentro de um empate no meio de várias faixas', () => {
    // Três faixas de pontuação (2, 1 e 0), com um empate na faixa do meio. O
    // líder tem que vir na frente e o par empatado tem que manter a ordem em
    // que chegou — é exatamente o caso para o qual a estabilidade existe.
    const lider = cru({ id: 100, original_language: 'pt' })
    const empatadoA = cru({ id: 21, title: 'A Origem' })
    const empatadoB = cru({ id: 22, title: 'Outro Nome' })
    const semSinal = cru({ id: 5 })

    const ordenado = ordenarPorPortugues([empatadoA, lider, empatadoB, semSinal])
    expect(ordenado.map((f) => f.id)).toEqual([100, 21, 22, 5])
  })
})
