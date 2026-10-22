import type { Metadata } from "next";
import Link from "next/link";
import { BLOQUES } from "@/lib/cms/bloques";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Contenidos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function fechaLima(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ContenidosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; borrador?: string; publicado?: string }>;
}) {
  const { error, borrador, publicado } = await searchParams;
  const supabase = createSupabaseServiceClient();
  const { data: filas } = await supabase
    .from("content_blocks")
    .select("block_key, status, updated_at");

  const porClave = new Map(
    (filas ?? []).map((f) => [String(f.block_key), f as { status: string; updated_at: string }]),
  );

  const paginas = Array.from(new Set(BLOQUES.map((b) => b.pagina)));

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Contenidos del sitio</h1>
        <p className="mt-1 text-sm text-ink-500">
          Edita los textos del sitio sin tocar código. Los borradores no se ven en el sitio público hasta publicarlos.
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}
        {borrador ? (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Borrador guardado. El sitio público sigue mostrando la última versión publicada.
          </p>
        ) : null}
        {publicado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Contenido publicado. El cambio ya es visible en el sitio.
          </p>
        ) : null}

        {paginas.map((pagina) => (
          <section key={pagina} aria-label={pagina} className="mt-8">
            <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-ink-500">{pagina}</h2>
            <ul className="mt-3 divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
              {BLOQUES.filter((b) => b.pagina === pagina).map((bloque) => {
                const fila = porClave.get(bloque.clave);
                const publicadoEstado = fila?.status === "published";
                return (
                  <li key={bloque.clave} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink-900">{bloque.clave}</p>
                      <p className="text-sm text-ink-500">{bloque.descripcion}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {publicadoEstado ? "Publicado" : fila ? "Borrador (no visible)" : "Sin cambios"} · Última modificación: {fechaLima(fila?.updated_at ?? null)}
                      </p>
                    </div>
                    <Link
                      href={`/admin/contenidos/${bloque.clave}`}
                      className="shrink-0 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                      Editar
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
