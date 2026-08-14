import type { Metadata } from 'next'
import { DM_Serif_Display, IBM_Plex_Mono, Inter } from 'next/font/google'
import { Cabecalho } from '@/components/layout/Cabecalho'
import { Rodape } from '@/components/layout/Rodape'
import './globals.css'

// Serifa editorial para o wordmark do app; Inter no corpo; monoespaçada nos
// números (ano, nota) para um efeito de timecode de cinema.
const fonteDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--nf-display',
  display: 'swap',
})
const fonteSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--nf-sans',
  display: 'swap',
})
const fonteMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--nf-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'O que assistir hoje',
  description: 'Filmes disponíveis nos serviços de streaming que você assina.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${fonteDisplay.variable} ${fonteSans.variable} ${fonteMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-fundo font-sans text-texto antialiased">
        <Cabecalho />
        {children}
        <Rodape />
      </body>
    </html>
  )
}
