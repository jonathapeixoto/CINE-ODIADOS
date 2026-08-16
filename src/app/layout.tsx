import type { Metadata } from 'next'
import { Archivo, Instrument_Sans } from 'next/font/google'
import { Cabecalho } from '@/components/layout/Cabecalho'
import { Rodape } from '@/components/layout/Rodape'
import './globals.css'

// Archivo é variável no peso e na largura: o mesmo arquivo dá a versão
// comprimida e pesada da marquise (ver .marquise em globals.css) e o peso
// normal dos títulos de seção, sem baixar duas fontes.
const fonteDisplay = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--nf-display',
  display: 'swap',
})
const fonteSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--nf-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CineOdiados',
  description: 'Filmes disponíveis nos serviços de streaming que você assina.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteDisplay.variable} ${fonteSans.variable}`}>
      {/* O respiro no topo é do <body>, não de cada página: o cabeçalho é
          `fixed` e sairia de cima do conteúdo de todas elas. Quem quer passar
          por baixo dele — o destaque da home, a arte de fundo do detalhe —
          cancela esse respiro com uma margem negativa do mesmo tamanho. */}
      <body className="flex min-h-screen flex-col bg-fundo pt-[var(--altura-cabecalho)] font-sans text-texto antialiased">
        <Cabecalho />
        {children}
        <Rodape />
      </body>
    </html>
  )
}
