import { createServer } from 'node:http'

const PORTA = Number(process.env.PORTA_MOCK ?? 4010)

// Metade com sinal forte de português, metade sem: sem essa variação o
// desempate de src/lib/tmdb/portugues.ts não teria o que ordenar.
//
// O `title` continua "Filme de Teste N" em todos, de propósito. O sorteio pega
// um filme qualquer e o e2e depois procura /Filme de Teste/ na Minha Lista —
// variar o título faria esse teste falhar de vez em quando, conforme o sorteio.
// Quem varia é o idioma original e a sinopse.
const filmes = Array.from({ length: 20 }, (_, i) => {
  const emPortugues = i % 2 === 0
  return {
    id: 100 + i,
    title: `Filme de Teste ${i + 1}`,
    original_title: `Test Movie ${i + 1}`,
    original_language: emPortugues ? 'pt' : 'en',
    overview: emPortugues ? `Sinopse do filme de teste número ${i + 1}.` : '',
    poster_path: null,
    backdrop_path: null,
    vote_average: 7 + (i % 3) / 10,
    vote_count: 500 + i,
    release_date: `20${10 + (i % 10)}-05-01`,
  }
})

// Cultpix não está no allowlist curado: ele existe aqui justamente para o e2e
// provar que o site não o mostra.
const provedores = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
  { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 2 },
  { provider_id: 692, provider_name: 'Cultpix', logo_path: '/cultpix.jpg', display_priority: 3 },
]

const generos = [
  { id: 35, name: 'Comédia' },
  { id: 28, name: 'Ação' },
]

const json = (resposta, corpo) => {
  resposta.writeHead(200, { 'content-type': 'application/json' })
  resposta.end(JSON.stringify(corpo))
}

const naoEncontrado = (resposta) => {
  resposta.writeHead(404, { 'content-type': 'application/json' })
  resposta.end(JSON.stringify({ status_message: 'não encontrado no mock' }))
}

const lista = { page: 1, results: filmes, total_pages: 2, total_results: 40 }

createServer((requisicao, resposta) => {
  const url = new URL(requisicao.url, `http://127.0.0.1:${PORTA}`)
  const caminho = url.pathname

  if (caminho === '/discover/movie' || caminho === '/search/movie') return json(resposta, lista)
  if (caminho === '/watch/providers/movie') return json(resposta, { results: provedores })
  if (caminho === '/genre/movie/list') return json(resposta, { genres: generos })

  const detalhe = caminho.match(/^\/movie\/(\d+)$/)
  if (detalhe) {
    // Como o TMDB real: id que não existe é 404, não o primeiro filme da lista.
    const filme = filmes.find((f) => f.id === Number(detalhe[1]))
    // O atraso força a ordem que expôs o defeito em produção: a página e o
    // generateMetadata correm em paralelo, e sem ele o 404 desta chamada chega
    // primeiro e mascara o 404 da chamada de disponibilidade.
    if (!filme) return setTimeout(() => naoEncontrado(resposta), 300)
    return json(resposta, {
      ...filme,
      runtime: 120,
      genres: generos,
      credits: { cast: [{ id: 1, name: 'Atriz de Teste', character: 'Protagonista', profile_path: null }] },
      videos: { results: [] },
    })
  }

  const disponibilidade = caminho.match(/^\/movie\/(\d+)\/watch\/providers$/)
  if (disponibilidade) {
    // Idem: para um id inexistente o TMDB responde 404 aqui também, e não uma
    // lista vazia — que é o que ele devolve para um filme sem streaming.
    if (!filmes.some((f) => f.id === Number(disponibilidade[1]))) return naoEncontrado(resposta)
    return json(resposta, {
      results: {
        BR: { link: 'https://www.justwatch.com/br/filme/teste', flatrate: [provedores[0]] },
      },
    })
  }

  return naoEncontrado(resposta)
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`TMDB falso ouvindo em http://127.0.0.1:${PORTA}`)
})
