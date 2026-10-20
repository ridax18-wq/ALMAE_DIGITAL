import type { Metadata } from "next";
import Link from "next/link";
import {
  bloquearHorario,
  retirarBloqueoAdmin,
  registrarPresencial,
} from "@/app/admin/(protegido)/agenda/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ETIQUETAS_ESTADO } from "@/lib/services/estados";
import { formatHorarioLima } from "@/lib/format";

export const metadata: Metadata = {
  title: "Agenda",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function diaLima(offsetDias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string; error?: string; presencial?: string; codigo?: string }>;
}) {
  const { fecha: fechaParam, vista: vistaParam, error: errorUrl, presencial, codigo } = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam ?? "") ? (fechaParam ?? diaLima(0)) : diaLima(0);
  const vista = vistaParam === "semana" ? "semana" : "dia";

  const supabase = createSupabaseServiceClient();

  const esSemana = vista === "semana";
  const dias: string[] = esSemana
    ? Array.from({ length: 7 }, (_, i) => {
        const base = new Date(`${fecha}T00:00:00-05:00`);
        const lunes = new Date(base.getTime() - (base.getUTCDay() === 0 ? 6 : base.getUTCDay() - 1) * 24 * 60 * 60_000);
        lunes.setUTCDate(lunes.getUTCDate() + i);
        return lunes.toLocaleDateString("en-CA", { timeZone: "UTC" });
      })
    : [fecha];

  const desdeUtc = new Date(`${dias[0]}T00:00:00-05:00`).toISOString();
  const hastaUtc = new Date(
    new Date(`${dias[dias.length - 1]}T00:00:00-05:00`).getTime() + 24 * 60 * 60_000,
  ).toISOString();

  const [{ data: citas }, { data: bloqueos }, { data: variantes }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, origin, starts_at, ends_at, public_code, patient:patients(id, full_name), service:services(id, name)")
        .in("status", ["HELD", "CONFIRMED", "COMPLETED", "NO_SHOW"])
        .gte("starts_at", desdeUtc)
        .lt("starts_at", hastaUtc)
        .order("starts_at"),
      supabase
        .from("schedule_blocks")
        .select("id, starts_at, ends_at, block_type, reason")
        .gte("starts_at", desdeUtc)
        .lt("ends_at", hastaUtc)
        .order("starts_at"),
      supabase
        .from("service_variants")
        .select("id, duration_minutes, amount_cents, service:services!inner(id, name, active, location)")
        .eq("services.active", true),
    ]);

  const variantesFiltradas = (variantes ?? []).filter(
    (v) => (v.service as unknown as { active: boolean; location: string }).active &&
      (v.service as unknown as { active: boolean; location: string }).location === "consultorio",
  );

  const porDia = new Map<string, { citas: NonNullable<typeof citas>; bloqueos: NonNullable<typeof bloqueos> }>();
  for (const dia of dias) porDia.set(dia, { citas: [], bloqueos: [] });

  for (const cita of citas ?? []) {
    const dia = String(cita.starts_at).slice(0, 10);
    porDia.get(dia)?.citas.push(cita);
  }
  for (const bloqueo of bloqueos ?? []) {
    const dia = String(bloqueo.starts_at).slice(0, 10);
    porDia.get(dia)?.bloqueos.push(bloqueo);
  }

  const tipoBloqueo: Record<string, string> = {
    BREAK: "Descanso",
    INTERNAL: "Interno",
    ABSENCE: "Ausencia",
    MAINTENANCE: "Mantenimiento",
    OTHER: "Otro",
  };

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Agenda</h1>
            <p className="mt-1 text-sm text-ink-500">
              {esSemana ? "Vista semanal" : "Vista diaria"} · America/Lima
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/agenda?vista=dia&fecha=${fecha}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${!esSemana ? "bg-brand-700 text-white" : "border border-sand-200 bg-white text-ink-700 hover:bg-sand-100"}`}
            >
              Día
            </Link>
            <Link
              href={`/admin/agenda?vista=semana&fecha=${fecha}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${esSemana ? "bg-brand-700 text-white" : "border border-sand-200 bg-white text-ink-700 hover:bg-sand-100"}`}
            >
              Semana
            </Link>
            <form action="/admin/agenda" className="flex gap-2">
              <input type="hidden" name="vista" value={vista} />
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                aria-label="Ir a fecha"
                className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-sand-100">
                Ir
              </button>
            </form>
          </div>
        </div>

        {presencial === "ok" ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Reserva presencial registrada y confirmada: {codigo}
          </p>
        ) : null}
        {errorUrl ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorUrl)}
          </p>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className={esSemana ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" : "space-y-4"}>
            {dias.map((dia) => (
              <section key={dia} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                <h2 className="font-display text-base font-bold text-ink-900">
                  {dia}
                  {dia === diaLima(0) ? (
                    <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">hoy</span>
                  ) : null}
                </h2>
                <ul className="mt-3 space-y-2">
                  {(porDia.get(dia)?.citas ?? []).map((cita) => {
                    const estadoInfo = ETIQUETAS_ESTADO[cita.status] ?? {
                      texto: cita.status,
                      clases: "border-sand-200 bg-sand-100 text-ink-700",
                    };
                    const esPresencial = cita.origin === "IN_PERSON";
                    return (
                      <li key={cita.id}>
                        <Link
                          href={`/admin/reservas/${cita.id}`}
                          className="block rounded-xl border border-sand-200 px-3 py-2.5 hover:border-brand-400 hover:bg-brand-50"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink-900">
                              {formatHorarioLima(String(cita.starts_at), String(cita.ends_at))}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estadoInfo.clases}`}>
                              {esPresencial ? "Presencial" : estadoInfo.texto}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-900">
                            {(cita.patient as unknown as { full_name: string } | null)?.full_name} ·{" "}
                            {(cita.service as unknown as { name: string } | null)?.name}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                  {(porDia.get(dia)?.bloqueos ?? []).map((bloqueo) => (
                    <li key={`bloqueo-${bloqueo.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-sand-300 bg-sand-50 px-3 py-2.5 text-sm">
                      <span className="text-ink-700">
                        <span className="font-semibold">
                          {formatHorarioLima(String(bloqueo.starts_at), String(bloqueo.ends_at))}
                        </span>{" "}
                        · {tipoBloqueo[bloqueo.block_type] ?? bloqueo.block_type}
                        {bloqueo.reason ? ` — ${bloqueo.reason}` : ""}
                      </span>
                      <form action={retirarBloqueoAdmin}>
                        <input type="hidden" name="block_id" value={bloqueo.id} />
                        <button type="submit" className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50">
                          Retirar
                        </button>
                      </form>
                    </li>
                  ))}
                  {(porDia.get(dia)?.citas ?? []).length === 0 && (porDia.get(dia)?.bloqueos ?? []).length === 0 ? (
                    <li className="rounded-xl bg-sand-50 px-3 py-3 text-sm text-ink-500">Sin ocupación</li>
                  ) : null}
                </ul>
              </section>
            ))}
          </div>

          <aside className="h-fit space-y-5">
            <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
              <h2 className="font-display text-base font-bold text-ink-900">
                Nueva reserva presencial
              </h2>
              <form action={registrarPresencial} className="mt-3 flex flex-col gap-2.5">
                <select name="variant_id" aria-label="Servicio y duración" required className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm">
                  {variantesFiltradas.map((v) => {
                    const servicio = v.service as unknown as { name: string };
                    return (
                      <option key={v.id} value={v.id}>
                        {servicio.name} — {v.duration_minutes} min — {formatPenCorta(v.amount_cents)}
                      </option>
                    );
                  })}
                </select>
                <div className="flex gap-2">
                  <input name="fecha" type="date" required defaultValue={diaLima(0)} aria-label="Fecha" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
                  <input name="hora" type="time" required aria-label="Hora" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
                </div>
                <input name="nombre" required minLength={2} maxLength={80} placeholder="Nombre completo" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                <input name="telefono" required pattern="9\d{8}" maxLength={9} inputMode="numeric" placeholder="Celular 9XXXXXXXX" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                <input name="email" type="email" placeholder="Correo (opcional)" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                <textarea name="notas" rows={2} maxLength={300} placeholder="Observaciones administrativas" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                <label className="flex items-start gap-2 text-xs text-ink-700">
                  <input type="checkbox" name="exencion" className="mt-0.5 size-4" />
                  Exención de adelanto (justificada por el administrador)
                </label>
                <input name="motivo_exencion" maxLength={120} placeholder="Motivo de la exención (si aplica)" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                <button type="submit" className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                  Registrar presencial (CONFIRMED)
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
              <h2 className="font-display text-base font-bold text-ink-900">Bloquear horario</h2>
              <form action={bloquearHorario} className="mt-3 flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <input name="fecha" type="date" required defaultValue={diaLima(0)} aria-label="Fecha del bloqueo" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
                  <select name="tipo" aria-label="Tipo de bloqueo" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm">
                    <option value="BREAK">Descanso</option>
                    <option value="INTERNAL">Actividad interna</option>
                    <option value="ABSENCE">Ausencia</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input name="hora_inicio" type="time" required aria-label="Inicio del bloqueo" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
                  <input name="hora_fin" type="time" required aria-label="Fin del bloqueo" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
                </div>
                <input name="motivo" maxLength={120} placeholder="Motivo (opcional)" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                <button type="submit" className="rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100">
                  Bloquear
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function formatPenCorta(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}
