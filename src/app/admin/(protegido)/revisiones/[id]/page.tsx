import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restaurarRevisionAction } from "@/app/admin/(protegido)/revisiones/actions";
import {
  compararSnapshots,
  obtenerRevision,
  obtenerRevisionAnterior,
} from "@/lib/cms/revisiones-historial";

export const metadata: Metadata = {
  title: "Detalle de versión",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function fechaLima(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "string") return valor.length > 300 ? `${valor.slice(0, 300)}…` : valor;
  return JSON.stringify(valor, null, 1);
}

export default async function DetalleRevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restaurada?: string; error?: string }>;
}) {
  const { id } = await params;
  const { restaurada, error } = await searchParams;

  const revision = await obtenerRevision(id);
  if (!revision) notFound();
  const anterior = await obtenerRevisionAnterior(revision);
  const diferencias = anterior
    ? compararSnapshots(anterior.snapshot, revision.snapshot)
    : [];

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/admin/revisiones"
          className="text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          ← Volver al historial
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">
          {revision.etiqueta}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {fechaLima(revision.createdAt)} · {revision.autorEmail ?? "sistema"}
        </p>

        {restaurada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Versión restaurada. Se generó una nueva revisión con este contenido.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}

        {anterior ? (
          <section className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
            <h2 className="font-display text-lg font-bold text-ink-900">
              Comparación con la versión anterior
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Anterior: {fechaLima(anterior.createdAt)} ·{" "}
              {anterior.autorEmail ?? "sistema"}
            </p>
            {diferencias.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                Sin cambios respecto a la versión anterior.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {diferencias.map((dif) => (
                  <li key={dif.clave} className="rounded-xl border border-sand-200 p-4">
                    <p className="text-sm font-semibold text-ink-900">{dif.clave}</p>
                    <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-xs font-bold text-red-700">Anterior</p>
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-ink-700">
                          {formatValor(dif.anterior)}
                        </pre>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs font-bold text-green-700">Esta versión</p>
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-ink-700">
                          {formatValor(dif.actual)}
                        </pre>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <p className="mt-6 rounded-2xl border border-sand-200 bg-white p-4 text-sm text-ink-500 shadow-xs">
            Esta es la primera versión registrada de esta entidad; no hay una
            anterior con la que comparar.
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
          <h2 className="font-display text-lg font-bold text-ink-900">
            Contenido de esta versión
          </h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-sand-50 p-4 text-xs whitespace-pre-wrap text-ink-700">
            {JSON.stringify(revision.snapshot, null, 2)}
          </pre>
        </section>

        <form
          action={restaurarRevisionAction}
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6"
        >
          <input type="hidden" name="revision_id" value={revision.id} />
          <h2 className="font-display text-lg font-bold text-ink-900">
            Restaurar esta versión
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            Aplicará el contenido de esta versión al sitio y generará una nueva
            revisión. El historial no se elimina.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="confirmar"
              required
              className="mt-0.5 size-4 rounded border-sand-300"
            />
            Confirmo que deseo restaurar esta versión (se creará una nueva
            revisión con este contenido).
          </label>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Restaurar versión
          </button>
        </form>
      </div>
    </main>
  );
}
