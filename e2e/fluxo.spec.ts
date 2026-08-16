import { expect, test } from '@playwright/test'

test('escolher serviços, filtrar, sortear, abrir detalhe e salvar na lista', async ({ page }) => {
  await page.goto('/')

  // Primeira visita: seleção de serviços.
  await expect(page.getByRole('heading', { name: /quais serviços você assina/i })).toBeVisible()

  // Só os serviços curados aparecem. O TMDB falso também serve o Cultpix, que
  // está fora do allowlist brasileiro, e ele não pode ter caixa em tela alguma.
  await expect(page.getByRole('checkbox', { name: 'Cultpix' })).toHaveCount(0)
  // "Amazon Prime Video" aparece pelo rótulo curado, não pelo nome do TMDB.
  // `exact: true` importa aqui: por padrão getByRole casa substring, e
  // 'Prime Video' bateria em "Amazon Prime Video" mesmo se a curadoria
  // regredisse — o que provaria o teste, não o produto.
  await expect(page.getByRole('checkbox', { name: 'Prime Video', exact: true })).toBeVisible()

  await page.getByRole('checkbox', { name: 'Netflix' }).check()
  await page.getByRole('button', { name: /ver filmes/i }).click()

  // Grade filtrada. O TMDB falso devolve 20 filmes "Filme de Teste 1".."20";
  // \b evita que a busca por "…Teste 1" também bata em "…Teste 10".."19".
  await expect(page.getByRole('link', { name: /Filme de Teste 1\b/ })).toBeVisible()

  // Os filtros moram num painel fechado, que abre por cima da grade em vez de
  // empurrá-la: a grade é o conteúdo da página, e um menu não pode jogá-la
  // para fora da tela. Então o caminho até um gênero começa pelo botão.
  await page.getByRole('button', { name: /filtros/i }).click()

  await expect(page.getByRole('checkbox', { name: 'Cultpix' })).toHaveCount(0)

  // Filtrar por gênero reescreve a URL. É um clique simples (não `.check()`):
  // o checkbox é controlado só pela prop `filtros` vinda do servidor, então o
  // estado "marcado" só chega depois da ida e volta do router.push — o mesmo
  // comportamento que BarraFiltros.test.tsx já documenta com o router mockado.
  await page.getByRole('checkbox', { name: 'Comédia' }).click()
  await expect(page).toHaveURL(/generos=35/)

  // Um clique fora fecha o painel, como qualquer menu suspenso.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('checkbox', { name: 'Comédia' })).toBeHidden()

  // Sorteio.
  await page.getByRole('button', { name: /surpreenda-me/i }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole('link', { name: /ver detalhes/i }).click()

  // Detalhe com onde assistir.
  await expect(page.getByRole('heading', { name: /onde assistir/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Na assinatura' })).toBeVisible()

  // Salvar na lista e conferir.
  await page.getByRole('button', { name: /salvar na minha lista/i }).click()
  await page.getByRole('link', { name: /minha lista/i }).click()
  await expect(page.getByRole('link', { name: /Filme de Teste/ })).toBeVisible()
})

// As duas frases são condição de acesso à API do TMDB, não cortesia: a
// documentação do JustWatch fala em revogar o acesso de quem não atribui. Por
// isso o teste percorre as rotas de verdade em vez de conferir só a home — um
// teste que promete "toda página" e visita uma só é pior do que teste nenhum.
// Um id que o TMDB não conhece precisa dar 404, não erro. Descoberto rodando o
// app em modo produção: a página tratava o 404 da chamada do filme mas não o da
// chamada de disponibilidade, e um link para um filme removido virava erro 500.
test('id de filme inexistente responde 404, não erro', async ({ page }) => {
  const resposta = await page.goto('/filme/999999999')
  expect(resposta?.status()).toBe(404)
})

const ROTAS = ['/', '/busca?q=teste', '/minha-lista']

for (const rota of ROTAS) {
  test(`o rodapé traz as atribuições obrigatórias em ${rota}`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.getByText(/fornecidos por JustWatch/i)).toBeVisible()
    await expect(page.getByText(/não é endossado, certificado ou aprovado pelo TMDB/i)).toBeVisible()
  })
}
