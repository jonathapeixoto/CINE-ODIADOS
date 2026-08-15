import { createServer } from 'node:http'

const PORTA = Number(process.env.PORTA_MOCK ?? 4010)

const filmes = Array.from({ length: 20 }, (_, i) => ({
  id: 100 + i,
  title: `Filme de Teste ${i + 1}`,
  original_title: `Test Movie ${i + 1}`,
  overview: `Sinopse do filme de teste número ${i + 1}.`,
  poster_path: null,
  backdrop_path: null,
  vote_average: 7 + (i % 3) / 10,
  vote_count: 500 + i,
  release_date: `20${10 + (i % 10)}-05-01`,
}))

const provedores = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
  { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 2 },
]

const generos = [
  { id: 35, name: 'Comédia' },
  { id: 28, name: 'Ação' },
]

const json = (resposta, corpo) => {
  resposta.writeHead(200, { 'content-type': 'application/json' })
  resposta.end(JSON.stringify(corpo))
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
    const filme = filmes.find((f) => f.id === Number(detalhe[1])) ?? filmes[0]
    return json(resposta, {
      ...filme,
      runtime: 120,
      genres: generos,
      credits: { cast: [{ id: 1, name: 'Atriz de Teste', character: 'Protagonista', profile_path: null }] },
      videos: { results: [] },
    })
  }

  if (/^\/movie\/\d+\/watch\/providers$/.test(caminho)) {
    return json(resposta, {
      results: {
        BR: { link: 'https://www.justwatch.com/br/filme/teste', flatrate: [provedores[0]] },
      },
    })
  }

  resposta.writeHead(404, { 'content-type': 'application/json' })
  resposta.end(JSON.stringify({ status_message: 'não encontrado no mock' }))
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`TMDB falso ouvindo em http://127.0.0.1:${PORTA}`)
})
