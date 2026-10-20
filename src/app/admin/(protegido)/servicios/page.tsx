import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Servicios",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminServiciosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: servicios } = await supabase
    .from("services")
    .select(
      "id, slug, name, location, active, sort_order, variants:service_variants(id, duration_minutes, prep_buffer_minutes, price, advance_amount)",
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
          {(servicios ?? []).map((servicio) => (
            <Link
              key={servicio.id}
              href={`/admin/servicios/${servicio.id}`}
              className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-base font-bold text-ink-900">
                  {servicio.name}
                </h2>
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
                {servicio.location === "domicilio" ? "A domicilio" : "En consultorio"} ·
                orden {servicio.sort_order}
              </p>
              <ul className="mt-3 space-y-1 text-sm text-ink-700">
                {(servicio.variants ?? []).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span>{v.duration_minutes} min</span>
                    <span className="font-semibold text-ink-900">
                      {formatPen(v.price)}
                    </span>
                  </li>
                ))}
                {(servicio.variants ?? []).length === 0 ? (
                  <li className="text-xs text-ink-500">Sin variantes de precio</li>
                ) : null}
              </ul>
              <p className="mt-3 text-sm font-semibold text-brand-700">Editar</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
