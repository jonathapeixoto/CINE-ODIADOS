import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import type { ImgHTMLAttributes } from 'react'

// next/image depende do runtime do Next; no jsdom basta uma <img>.
vi.mock('next/image', () => ({
  default: ({ src, alt, priority, ...resto }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img src={typeof src === 'string' ? src : ''} alt={alt} data-priority={priority?.toString()} {...resto} />
  ),
}))
