import type { Metadata } from "next";
import Link from "next/link";
import { reordenarServicio } from "@/app/admin/(protegido)/servicios/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Servicios",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ETIQUETA_MODO: Record<string, string> = {
  reservable: "reservable",
  visible: "solo visible",
  consulta: "solo consulta",
};

export default async function AdminServiciosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: servicios } = await supabase
    .from("services")
    .select(
      "id, slug, name, location, active, sort_order, catalog_mode, image_media_id, media:media_assets!services_image_media_id_fkey(storage_path), variants:service_variants(id, duration_minutes, prep_buffer_minutes, amount_cents, deposit_cents)",
    )
    .order("sort_order");

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">
              Servicios
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Catálogo publicado en el sitio público (solo activos)
            </p>
          </div>
          <Link
            href="/admin/servicios/nuevo"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            + Nuevo servicio
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(servicios ?? []).map((servicio) => {
            const mediaPath = Array.isArray(servicio.media)
              ? (servicio.media[0] as { storage_path?: string } | undefined)?.storage_path
              : (servicio.media as { storage_path?: string } | null)?.storage_path;
            const imgSrc = mediaPath
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/almae-media/${mediaPath}`
              : null;
            return (
            <div
              key={servicio.id}
              className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/admin/servicios/${servicio.id}`} className="min-w-0">
                  <h2 className="font-display text-base font-bold text-ink-900 hover:text-brand-700">
                    {servicio.name}
                  </h2>
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    servicio.active
                      ? "border border-green-200 bg-green-50 text-green-900"
                      : "border border-sand-200 bg-sand-100 text-ink-700"
                  }`}
                >
                  {servicio.active ? "activo" : "inactivo"}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {servicio.location === "domicilio" ? "A domicilio" : "En consultorio"} ·{" "}
                {ETIQUETA_MODO[servicio.catalog_mode] ?? servicio.catalog_mode} · orden {servicio.sort_order}
              </p>
              {imgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgSrc} alt="" className="mt-3 h-28 w-full rounded-lg object-cover" />
              ) : (
                <p className="mt-3 rounded-lg bg-sand-50 px-3 py-4 text-center text-xs text-ink-500">
                  Sin imagen asignada
                </p>
              )}
              <ul className="mt-3 space-y-1 text-sm text-ink-700">
                {(servicio.variants ?? []).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span>{v.duration_minutes} min</span>
                    <span className="font-semibold text-ink-900">
                      {formatPen(v.amount_cents)}
                    </span>
                  </li>
                ))}
                {(servicio.variants ?? []).length === 0 ? (
                  <li className="text-xs text-ink-500">Sin variantes de precio</li>
                ) : null}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2">
                <form action={reordenarServicio} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={servicio.id} />
                  <input type="hidden" name="paso" value="-1" />
                  <button
                    type="submit"
                    aria-label={`Subir ${servicio.name}`}
                    className="rounded-lg border border-sand-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                  >
                    ↑
                  </button>
                </form>
                <form action={reordenarServicio} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={servicio.id} />
                  <input type="hidden" name="paso" value="1" />
                  <button
                    type="submit"
                    aria-label={`Bajar ${servicio.name}`}
                    className="rounded-lg border border-sand-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                  >
                    ↓
                  </button>
                </form>
                <Link
                  href={`/admin/servicios/${servicio.id}`}
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  Editar
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
