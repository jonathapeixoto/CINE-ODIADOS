export function Rodape() {
  return (
    <footer className="border-t border-borda bg-fundo">
      <div className="envelope py-10 text-xs leading-relaxed text-texto-fraco">
        <p className="marquise text-base text-texto-fraco/70">CineOdiados</p>
        <p className="mt-4">Dados de disponibilidade em streaming fornecidos por JustWatch.</p>
        <p className="mt-1">
          Este produto usa a API do TMDB, mas não é endossado, certificado ou aprovado pelo TMDB.
        </p>
        {/* O logo precisa aparecer com menos destaque que a identidade do app: */}
        {/* pequeno, monocromático e discreto, abaixo do texto de atribuição. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tmdb.svg"
          alt="TMDB"
          width={196}
          height={14}
          loading="lazy"
          className="mt-4 opacity-40 grayscale"
        />
      </div>
    </footer>
  )
}
