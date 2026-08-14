import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-2xl text-texto sm:text-3xl">Não encontrei essa página</h1>
      <Link
        href="/"
        className="mt-6 rounded-full bg-acento px-5 py-2 text-sm font-semibold text-acento-texto transition-colors hover:bg-acento-forte"
      >
        Voltar para a home
      </Link>
    </main>
  )
}
