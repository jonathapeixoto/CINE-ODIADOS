import type { FilmeCru } from './tipos-crus'

const preenchido = (valor: string | undefined): string => valor?.trim() ?? ''

/**
 * O TMDB não tem campo de dublagem nem de legenda — não existe parâmetro de
 * idioma de áudio no /discover, e /translations fala de texto, não de faixa de
 * áudio. O que dá para medir é indireto, e por isso o resultado é desempate e
 * nunca filtro: se o sinal errar, o custo é uma posição na grade.
 *
 * Nada disso vira texto na tela. Escrever "Dublado" a partir daqui seria uma
 * promessa que o dado não sustenta.
 */
export function pontuarPortugues(cru: FilmeCru): number {
  const original = preenchido(cru.original_title)
  const traduzido = preenchido(cru.title)

  return (
    // Falado em português: não depende de dublagem nenhuma.
    (cru.original_language === 'pt' ? 2 : 0) +
    // Título brasileiro existe, logo houve lançamento comercial aqui.
    (traduzido !== '' && traduzido !== original ? 1 : 0) +
    // O TMDB devolve overview vazio quando não há tradução no idioma pedido.
    (preenchido(cru.overview) !== '' ? 1 : 0)
  )
}

/**
 * Decrescente por pontuação, estável no empate. A estabilidade é requisito, não
 * detalhe: dentro de uma faixa a ordem que o usuário pediu tem que sobreviver.
 * O índice entra na comparação em vez de confiar na estabilidade do `sort` do
 * runtime — a garantia fica no código, onde o teste consegue vê-la.
 */
export function ordenarPorPortugues(crus: FilmeCru[]): FilmeCru[] {
  return crus
    .map((cru, ordem) => ({ cru, ponto: pontuarPortugues(cru), ordem }))
    .sort((a, b) => b.ponto - a.ponto || a.ordem - b.ordem)
    .map((item) => item.cru)
}
