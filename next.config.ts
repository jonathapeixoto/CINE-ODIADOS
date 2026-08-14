import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    // Nos testes end-to-end a API é falsa e não há imagens reais para otimizar.
    unoptimized: process.env.E2E === '1',
    remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org' }],
  },
}

export default config
