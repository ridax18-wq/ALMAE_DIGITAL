import type { Metadata } from "next";
import { guardarConfiguracion } from "@/app/admin/(protegido)/configuracion/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Configuración",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { guardado } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: config } = await supabase
    .from("business_settings")
    .select(
      "id, booking_hold_ttl_minutes, booking_gap_minutes, min_booking_lead_hours, max_advance_days, cancellation_policy_hours, advance_percent, max_hold_extension_minutes, whatsapp_number, address_public",
    )
    .limit(1)
    .maybeSingle();

  if (!config) {
    return (
      <main className="py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No hay fila de configuración. Aplica la migración de semillas
            (0005) antes de usar el panel.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Configuración del negocio
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Parámetros operativos (todos aplicables de inmediato al sitio público)
        </p>

        {guardado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Configuración guardada.
          </p>
        ) : null}

        <form action={guardarConfiguracion} className="mt-5 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
          <input type="hidden" name="id" value={config.id} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="hold" className="mb-1 block text-sm font-semibold text-ink-900">
                Vigencia de reserva temporal (minutos)
              </label>
              <input id="hold" name="booking_hold_ttl_minutes" type="number" min="1" max="120" defaultValue={config.booking_hold_ttl_minutes} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="gap" className="mb-1 block text-sm font-semibold text-ink-900">
                Separación entre citas (minutos)
              </label>
              <input id="gap" name="booking_gap_minutes" type="number" min="0" max="60" defaultValue={config.booking_gap_minutes} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="lead" className="mb-1 block text-sm font-semibold text-ink-900">
                Antelación mínima (horas)
              </label>
              <input id="lead" name="min_booking_lead_hours" type="number" min="0" max="72" defaultValue={config.min_booking_lead_hours} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="horizonte" className="mb-1 block text-sm font-semibold text-ink-900">
                Horizonte de agenda (días)
              </label>
              <input id="horizonte" name="max_advance_days" type="number" min="1" max="365" defaultValue={config.max_advance_days} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="cancelacion" className="mb-1 block text-sm font-semibold text-ink-900">
                Plazo de cancelación sin penalidad (horas)
              </label>
              <input id="cancelacion" name="cancellation_policy_hours" type="number" min="1" max="168" defaultValue={config.cancellation_policy_hours} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="adelanto" className="mb-1 block text-sm font-semibold text-ink-900">
                Adelanto por defecto (%)
              </label>
              <input id="adelanto" name="advance_percent" type="number" min="0" max="100" defaultValue={config.advance_percent} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="extension" className="mb-1 block text-sm font-semibold text-ink-900">
                Extensión máxima de retención (minutos)
              </label>
              <input id="extension" name="max_hold_extension_minutes" type="number" min="0" max="120" defaultValue={config.max_hold_extension_minutes} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="whatsapp" className="mb-1 block text-sm font-semibold text-ink-900">
                WhatsApp (formato internacional, ej: 51919608174)
              </label>
              <input id="whatsapp" name="whatsapp_number" defaultValue={config.whatsapp_number ?? ""} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="direccion" className="mb-1 block text-sm font-semibold text-ink-900">
                Dirección pública
              </label>
              <input id="direccion" name="address_public" defaultValue={config.address_public ?? ""} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm" />
            </div>
          </div>
          <button type="submit" className="mt-6 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            Guardar configuración
          </button>
        </form>
      </div>
    </main>
  );
}
