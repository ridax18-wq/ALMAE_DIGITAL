import type { Metadata } from "next";
import Link from "next/link";
import { obtenerHistorialRevisiones } from "@/lib/cms/revisiones-historial";

export const metadata: Metadata = {
  title: "Historial de versiones",
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

export default async function HistorialRevisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; restaurada?: string }>;
}) {
  const { error, restaurada } = await searchParams;
  const historial = await obtenerHistorialRevisiones({ limit: 100 });

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Historial de versiones
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Todas las revisiones publicadas de contenidos y configuración. El
          historial nunca se elimina; restaurar una versión crea una nueva
          revisión.
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}
        {restaurada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Versión restaurada. Se generó una nueva revisión con ese contenido.
          </p>
        ) : null}

        <ul className="mt-6 divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white shadow-xs">
          {historial.map((rev) => (
            <li key={rev.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-ink-900">{rev.etiqueta}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {fechaLima(rev.createdAt)} · {rev.autorEmail ?? "sistema"}
                </p>
              </div>
              <Link
                href={`/admin/revisiones/${rev.id}`}
                className="rounded-xl border border-sand-300 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-sand-50"
              >
                Ver versión
              </Link>
            </li>
          ))}
          {historial.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-ink-500">
              Aún no hay revisiones registradas.
            </li>
          ) : null}
        </ul>
      </div>
    </main>
  );
}
