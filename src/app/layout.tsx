import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'O que assistir hoje',
  description: 'Filmes disponíveis nos serviços de streaming que você assina.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
