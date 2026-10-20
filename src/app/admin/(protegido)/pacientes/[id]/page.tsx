import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guardarNotasPaciente, cambiarConsentimiento } from "@/app/admin/(protegido)/pacientes/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ETIQUETAS_ESTADO } from "@/lib/services/estados";
import { formatFechaLima, formatHorarioLima, formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Detalle de paciente",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PacienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { id } = await params;
  const { guardado } = await searchParams;

  const supabase = createSupabaseServiceClient();

  const { data: paciente } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, contact_consent, consent_at, notes_admin, created_at, marketing_source_id")
    .eq("id", id)
    .maybeSingle();

  if (!paciente) {
    notFound();
  }

  const { data: historial } = await supabase
    .from("bookings")
    .select("id, status, starts_at, ends_at, total_amount, advance_amount, service_id")
    .eq("patient_id", id)
    .order("starts_at", { ascending: false });

  const idsServicios = Array.from(
    new Set((historial ?? []).map((h) => String(h.service_id))),
  );

  const { data: servicios } = idsServicios.length
    ? await supabase.from("services").select("id, name").in("id", idsServicios)
    : { data: [] };

  const nombreServicio = new Map((servicios ?? []).map((s) => [String(s.id), s.name]));

  let origen = "—";
  if (paciente.marketing_source_id) {
    const { data: fuente } = await supabase
      .from("marketing_sources")
      .select("name")
      .eq("id", paciente.marketing_source_id)
      .maybeSingle();
    origen = fuente?.name ?? origen;
  }

  const gastoTotal = (historial ?? [])
    .filter((h) => ["CONFIRMED", "COMPLETED"].includes(h.status))
    .reduce((t, h) => t + Number(h.total_amount), 0);

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/pacientes" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a pacientes
        </Link>

        {guardado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Cambios guardados.
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {paciente.full_name}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {paciente.phone}
            {paciente.email ? ` · ${paciente.email}` : ""} · registrado el{" "}
            {String(paciente.created_at).slice(0, 10)}
          </p>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-sand-100 p-4">
              <dt className="text-xs uppercase text-ink-500">Citas confirmadas</dt>
              <dd className="mt-1 font-display text-xl font-bold text-ink-900">
                {(historial ?? []).filter((h) => ["CONFIRMED", "COMPLETED"].includes(h.status)).length}
              </dd>
            </div>
            <div className="rounded-xl bg-sand-100 p-4">
              <dt className="text-xs uppercase text-ink-500">Valor atendido</dt>
              <dd className="mt-1 font-display text-xl font-bold text-ink-900">
                {formatPen(gastoTotal)}
              </dd>
            </div>
            <div className="rounded-xl bg-sand-100 p-4">
              <dt className="text-xs uppercase text-ink-500">Origen comercial</dt>
              <dd className="mt-1 font-semibold text-ink-900">{origen}</dd>
            </div>
          </dl>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">
                Historial de citas
              </h2>
              {historial && historial.length > 0 ? (
                <ul className="mt-3 divide-y divide-sand-200 rounded-xl border border-sand-200">
                  {historial.map((cita) => {
                    const estadoInfo = ETIQUETAS_ESTADO[cita.status] ?? {
                      texto: cita.status,
                      clases: "border-sand-200 bg-sand-100 text-ink-700",
                    };
                    return (
                      <li key={cita.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                        <Link href={`/admin/reservas/${cita.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                          {formatFechaLima(String(cita.starts_at))} · {formatHorarioLima(String(cita.starts_at), String(cita.ends_at))}
                          <span className="block text-xs text-ink-500">
                            {nombreServicio.get(String(cita.service_id))}
                          </span>
                        </Link>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estadoInfo.clases}`}>
                          {estadoInfo.texto}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-500">Sin citas registradas</p>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">
                  Notas operativas
                </h2>
                <form action={guardarNotasPaciente} className="mt-3">
                  <input type="hidden" name="paciente_id" value={paciente.id} />
                  <textarea
                    name="notas"
                    rows={4}
                    defaultValue={paciente.notes_admin}
                    maxLength={500}
                    placeholder="Notas operativas (no clínicas): preferencias de horario, avisos..."
                    className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm"
                  />
                  <button type="submit" className="mt-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                    Guardar notas
                  </button>
                </form>
              </div>

              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">
                  Contacto comercial
                </h2>
                <form action={cambiarConsentimiento} className="mt-3 flex items-center gap-3">
                  <input type="hidden" name="paciente_id" value={paciente.id} />
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      name="consent"
                      defaultChecked={paciente.contact_consent}
                      className="size-4"
                    />
                    Autoriza mensajes comerciales
                  </label>
                  <button type="submit" className="rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100">
                    Guardar
                  </button>
                </form>
                <p className="mt-2 text-xs text-ink-500">
                  Consentimiento registrado:{" "}
                  {paciente.consent_at ? String(paciente.consent_at).slice(0, 16).replace("T", " ") : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
