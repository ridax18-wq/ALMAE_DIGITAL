import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormBloque } from "@/app/admin/(protegido)/contenidos/FormBloque";
import { cuerpoDefecto, esquemas, MAPA_BLOQUES } from "@/lib/cms/bloques";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Editar contenido",
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

export default async function EditarContenidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ bloque: string }>;
  searchParams: Promise<{ error?: string; borrador?: string; publicado?: string }>;
}) {
  const { bloque } = await params;
  const { error, borrador, publicado } = await searchParams;
  const def = MAPA_BLOQUES.get(bloque);
  if (!def) notFound();

  const supabase = createSupabaseServiceClient();
  const { data: fila } = await supabase
    .from("content_blocks")
    .select("body, status, updated_at")
    .eq("block_key", bloque)
    .maybeSingle();

  const defecto = cuerpoDefecto(def.clave);
  let cuerpoInicial: Record<string, unknown> = defecto as Record<string, unknown>;
  let tieneFila = false;

  if (fila?.body) {
    const parseo = esquemas[def.clave].safeParse(fila.body);
    if (parseo.success) {
      cuerpoInicial = parseo.data as Record<string, unknown>;
      tieneFila = true;
    }
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Migas" className="text-sm">
          <Link href="/admin/contenidos" className="font-semibold text-brand-700 hover:underline">
            ← Contenidos
          </Link>
          <span className="mx-2 text-ink-400">/</span>
          <span className="text-ink-700">{def.pagina}</span>
        </nav>

        <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">{def.pagina}</h1>
        <p className="mt-1 text-sm text-ink-500">{def.descripcion}</p>
        <p className="mt-1 text-xs text-ink-500">
          Estado actual: {fila?.status === "published" ? "Publicado" : fila ? "Borrador (no visible en el sitio)" : "Sin cambios guardados"} · Última modificación: {fechaLima(fila?.updated_at ?? null)}
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No se pudo guardar: {decodeURIComponent(error)}
          </p>
        ) : null}
        {borrador ? (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Borrador guardado. El sitio público no cambia hasta que publiques.
          </p>
        ) : null}
        {publicado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Publicado. El cambio ya se refleja en el sitio público.
          </p>
        ) : null}

        <div className="mt-6">
          <FormBloque
            bloque={bloque}
            cuerpoInicial={cuerpoInicial}
            tieneFila={tieneFila}
            campos={def.campos}
          />
        </div>
      </div>
    </main>
  );
}
