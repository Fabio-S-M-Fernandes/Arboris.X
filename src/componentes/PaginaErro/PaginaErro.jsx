import { Link } from 'react-router-dom';

export default function PaginaErro({ codigo, titulo, mensagem }) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#050f14] px-6 py-16 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,255,163,0.12),transparent_45%)]" />
      <section className="relative w-full max-w-2xl rounded-3xl border-emerald-400/20 bg-slate-900/70 px-6 py-12 text-center shadow-2xl shadow-emerald-950/30 backdrop-blur-sm sm:px-12 sm:py-16">
        <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-emerald-300 uppercase">Arboris.X · Estado do sistema</p>
        <p className="animate-[erro-entrar_700ms_ease-out_both] bg-linear-to-br from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-8xl leading-none font-black tracking-tight text-transparent motion-reduce:animate-none sm:text-9xl">
          {codigo}
        </p>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">{mensagem}</p>
        <Link
          to="/"
          className="mt-9 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-400 px-7 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors duration-200 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
        >
          Voltar ao Início
        </Link>
      </section>
    </main>
  );
}
