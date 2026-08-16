import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-texto sm:text-3xl">Não encontrei essa página</h1>
      <Link
        href="/"
        className="mt-6 rounded-sm bg-texto px-6 py-2.5 text-sm font-bold text-fundo transition-colors hover:bg-white"
      >
        Voltar para a home
      </Link>
    </main>
  )
}
