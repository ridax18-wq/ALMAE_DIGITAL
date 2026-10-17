import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="bg-sand-50 py-20 sm:py-28">
      <div className="mx-auto max-w-md px-4 text-center">
        <p className="font-display text-6xl font-extrabold text-brand-200">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">
          No encontramos esta página
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Puede que el enlace haya cambiado o que la página no exista. Vuelve
          al inicio o revisa nuestros servicios.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Volver al inicio
          </Link>
          <Link
            href="/servicios"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-700/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
          >
            Ver servicios
          </Link>
        </div>
      </div>
    </main>
  );
}
