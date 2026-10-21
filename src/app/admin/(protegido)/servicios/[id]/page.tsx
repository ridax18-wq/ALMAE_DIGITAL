import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioServicio } from "@/app/admin/(protegido)/servicios/FormularioServicio";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Editar servicio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditarServicioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { id } = await params;
  const { guardado } = await searchParams;

  const supabase = createSupabaseServiceClient();

  const { data: servicio } = await supabase
    .from("services")
    .select(
      "id, slug, name, description, location, active, instructions, sort_order, variants:service_variants(id, duration_minutes, prep_buffer_minutes, amount_cents, deposit_cents)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!servicio) notFound();

  const { data: reservasPorVariante } = await supabase
    .from("bookings")
    .select("service_variant_id");

  const idsOcupados = new Set(
    (reservasPorVariante ?? []).map((r) => String(r.service_variant_id)),
  );

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/servicios" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a servicios
        </Link>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Editar servicio
          </h1>
          {guardado ? (
            <p role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              Cambios guardados.
            </p>
          ) : null}
          <FormularioServicio
            servicio={{
              id: servicio.id,
              slug: servicio.slug,
              name: servicio.name,
              description: servicio.description,
              location: servicio.location,
              active: servicio.active,
              instructions: servicio.instructions,
              sort_order: servicio.sort_order,
              variantes: (servicio.variants ?? []).map((v) => ({
                id: String(v.id),
                duracion: v.duration_minutes,
                prep: v.prep_buffer_minutes,
                precio: v.amount_cents / 100,
                adelanto: v.deposit_cents === null ? null : v.deposit_cents / 100,
                reservable: idsOcupados.has(String(v.id)),
              })),
            }}
          />
        </div>
      </div>
    </main>
  );
}
