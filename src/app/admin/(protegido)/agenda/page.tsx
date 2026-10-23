import type { Metadata } from "next";
import Link from "next/link";
import {
  bloquearHorario,
  retirarBloqueoAdmin,
  registrarPresencial,
} from "@/app/admin/(protegido)/agenda/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ETIQUETAS_ESTADO } from "@/lib/services/estados";
import { formatFechaLima } from "@/lib/format";
import {
  esRetencionExpirada,
  etiquetaOrigen,
  fechaLimaDeIso,
  horaDeMinutos,
  horaLimaDeIso,
  huecosLibres,
  mensajeConfirmacionCita,
  minutosDeDuracion,
  minutosDeHora,
  weekdayDeFechaLima,
  type FranjaLaboral,
} from "@/lib/services/agenda-vista";
import { obtenerConfiguracionPublica } from "@/lib/cms/config-publica";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { HorasDisponibles } from "@/app/admin/(protegido)/agenda/HorasDisponibles";

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

function desplazarFecha(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00-05:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const TIPO_BLOQUEO: Record<string, string> = {
  BREAK: "Descanso",
  INTERNAL: "Interno",
  ABSENCE: "Ausencia",
  MAINTENANCE: "Mantenimiento",
  OTHER: "Otro",
};

const LEYENDA: { texto: string; clases: string }[] = [
  { texto: "Confirmada", clases: "bg-green-500" },
  { texto: "Pendiente de confirmación", clases: "bg-amber-500" },
  { texto: "Bloqueada", clases: "bg-ink-400" },
  { texto: "Disponible", clases: "bg-brand-200" },
  { texto: "Cancelada", clases: "bg-sand-300" },
];

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string; error?: string; presencial?: string; codigo?: string }>;
}) {
  const { fecha: fechaParam, vista: vistaParam, error: errorUrl, presencial, codigo } = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam ?? "") ? (fechaParam ?? diaLima(0)) : diaLima(0);
  const vista = vistaParam === "semana" ? "semana" : "dia";
  const ahoraIso = new Date().toISOString();

  const supabase = createSupabaseServiceClient();

  const esSemana = vista === "semana";
  const dias: string[] = esSemana
    ? Array.from({ length: 7 }, (_, i) => {
        const base = new Date(`${fecha}T00:00:00-05:00`);
        const dow = base.getUTCDay();
        const lunes = new Date(base.getTime() - (dow === 0 ? 6 : dow - 1) * 24 * 60 * 60_000);
        lunes.setUTCDate(lunes.getUTCDate() + i);
        return lunes.toISOString().slice(0, 10);
      })
    : [fecha];

  const desdeUtc = new Date(`${dias[0]}T00:00:00-05:00`).toISOString();
  const hastaUtc = new Date(
    new Date(`${dias[dias.length - 1]}T00:00:00-05:00`).getTime() + 24 * 60 * 60_000,
  ).toISOString();

  const [{ data: citas }, { data: bloqueos }, { data: horas }, { data: variantes }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, status, origin, starts_at, ends_at, hold_expires_at, public_code, patient:patients(id, full_name), service:services(id, name)",
      )
      .in("status", ["HELD", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"])
      .gte("starts_at", desdeUtc)
      .lt("starts_at", hastaUtc)
      .order("starts_at"),
    supabase
      .from("schedule_blocks")
      .select("id, starts_at, ends_at, block_type, reason")
      .gte("starts_at", desdeUtc)
      .lt("ends_at", hastaUtc)
      .order("starts_at"),
    supabase.from("business_hours").select("day_of_week, opens_at, closes_at, break_start, break_end"),
    supabase
      .from("service_variants")
      .select("id, duration_minutes, amount_cents, service:services!inner(id, name, active, location)")
      .eq("services.active", true),
  ]);

  const variantesFiltradas = (variantes ?? []).filter(
    (v) =>
      (v.service as unknown as { active: boolean; location: string }).active &&
      (v.service as unknown as { active: boolean; location: string }).location === "consultorio",
  );

  const cfg = await obtenerConfiguracionPublica();

  const citasVisibles = (citas ?? []).filter(
    (c) => !esRetencionExpirada(c.status, c.hold_expires_at, ahoraIso),
  );

  const franjaPorDia = new Map<number, FranjaLaboral>();
  for (const h of horas ?? []) {
    franjaPorDia.set(h.day_of_week, {
      apertura: String(h.opens_at).slice(0, 5),
      cierre: String(h.closes_at).slice(0, 5),
      descanso:
        h.break_start && h.break_end
          ? { desde: String(h.break_start).slice(0, 5), hasta: String(h.break_end).slice(0, 5) }
          : undefined,
    });
  }

  const porDia = new Map<string, { citas: typeof citasVisibles; bloqueos: NonNullable<typeof bloqueos> }>();
  for (const dia of dias) porDia.set(dia, { citas: [], bloqueos: [] });

  for (const cita of citasVisibles) {
    const dia = fechaLimaDeIso(String(cita.starts_at));
    porDia.get(dia)?.citas.push(cita);
  }
  for (const bloqueo of bloqueos ?? []) {
    const dia = fechaLimaDeIso(String(bloqueo.starts_at));
    porDia.get(dia)?.bloqueos.push(bloqueo);
  }

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
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/agenda?vista=${vista}`}
              className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100"
            >
              Hoy
            </Link>
            <Link
              href={`/admin/agenda?vista=dia&fecha=${desplazarFecha(fecha, esSemana ? -7 : -1)}`}
              aria-label="Periodo anterior"
              className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100"
            >
              ←
            </Link>
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
            <Link
              href={`/admin/agenda?vista=${vista}&fecha=${desplazarFecha(fecha, esSemana ? 7 : 1)}`}
              aria-label="Periodo siguiente"
              className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100"
            >
              →
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

        <ul className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-ink-700" aria-label="Leyenda de la agenda">
          {LEYENDA.map((item) => (
            <li key={item.texto} className="flex items-center gap-1.5">
              <span className={`inline-block size-3 rounded-full ${item.clases}`} aria-hidden="true" />
              {item.texto}
            </li>
          ))}
        </ul>

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
            {dias.map((dia) => {
              const franja = franjaPorDia.get(weekdayDeFechaLima(dia));
              const ocupacionesDia = [
                ...(porDia.get(dia)?.citas ?? []).map((c) => ({
                  inicio: minutosDeHora(horaLimaDeIso(String(c.starts_at))),
                  fin: minutosDeHora(horaLimaDeIso(String(c.ends_at))),
                })),
                ...(porDia.get(dia)?.bloqueos ?? []).map((b) => ({
                  inicio: minutosDeHora(horaLimaDeIso(String(b.starts_at))),
                  fin: minutosDeHora(horaLimaDeIso(String(b.ends_at))),
                })),
              ];
              const huecos = franja ? huecosLibres(franja, ocupacionesDia) : [];

              return (
                <section key={dia} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                  <h2 className="font-display text-base font-bold text-ink-900">
                    {formatFechaLima(`${dia}T12:00:00`)}
                    {dia === diaLima(0) ? (
                      <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">hoy</span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {franja
                      ? `Horario: ${franja.apertura} – ${franja.cierre}${franja.descanso ? ` · descanso ${franja.descanso.desde} – ${franja.descanso.hasta}` : ""}`
                      : "Sin horario configurado (cerrado)"}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {(porDia.get(dia)?.citas ?? []).map((cita) => {
                      const cancelada = cita.status === "CANCELLED";
                      const estadoInfo = ETIQUETAS_ESTADO[cita.status] ?? {
                        texto: cita.status,
                        clases: "border-sand-200 bg-sand-100 text-ink-700",
                      };
                      return (
                        <li key={cita.id}>
                          <Link
                            href={`/admin/reservas/${cita.id}`}
                            className={`block rounded-xl border border-sand-200 px-3 py-2.5 hover:border-brand-400 hover:bg-brand-50 ${cancelada ? "opacity-60" : ""}`}
                          >
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`font-semibold text-ink-900 ${cancelada ? "line-through" : ""}`}>
                                {horaLimaDeIso(String(cita.starts_at))} – {horaLimaDeIso(String(cita.ends_at))}
                                <span className="ml-2 text-xs font-normal text-ink-500">
                                  {minutosDeDuracion(String(cita.starts_at), String(cita.ends_at))} min
                                </span>
                              </span>
                              <span className="flex flex-wrap gap-1.5">
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estadoInfo.clases}`}>
                                  {estadoInfo.texto}
                                </span>
                                <span className="rounded-full border border-sand-200 bg-sand-50 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                                  {etiquetaOrigen(cita.origin)}
                                </span>
                              </span>
                            </span>
                            <span className="mt-0.5 block text-sm text-ink-900">
                              {(cita.patient as unknown as { full_name: string } | null)?.full_name} ·{" "}
                              {(cita.service as unknown as { name: string } | null)?.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-ink-500">Código: {cita.public_code}</span>
                            {cita.status === "CONFIRMED" && cita.origin !== "WEB"
                              ? (() => {
                                  const enlace = buildWhatsAppUrl("general", undefined, {
                                    numero: cfg.whatsapp,
                                    mensaje: mensajeConfirmacionCita({
                                      servicio:
                                        (cita.service as unknown as { name: string } | null)?.name ?? "",
                                      fechaLima: formatFechaLima(`${fechaLimaDeIso(String(cita.starts_at))}T12:00:00`),
                                      horaLima: horaLimaDeIso(String(cita.starts_at)),
                                      codigo: cita.public_code,
                                      direccion: cfg.direccionCompleta,
                                    }),
                                  });
                                  return enlace ? (
                                    <a
                                      href={enlace}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-block rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-900 hover:bg-green-100"
                                    >
                                      Confirmar por WhatsApp
                                    </a>
                                  ) : null;
                                })()
                              : null}
                          </Link>
                        </li>
                      );
                    })}
                    {(porDia.get(dia)?.bloqueos ?? []).map((bloqueo) => (
                      <li key={`bloqueo-${bloqueo.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50 px-3 py-2.5 text-sm">
                        <span className="text-ink-700">
                          <span className="font-semibold">
                            {horaLimaDeIso(String(bloqueo.starts_at))} – {horaLimaDeIso(String(bloqueo.ends_at))}
                          </span>{" "}
                          · Bloqueada · {tipoBloqueoTexto(bloqueo.block_type)}
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
                    {franja && huecos.length > 0 ? (
                      <li className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900">
                        Disponible:{" "}
                        {huecos.map((h) => `${horaDeMinutos(h.inicio)} – ${horaDeMinutos(h.fin)}`).join(" · ")}
                      </li>
                    ) : null}
                    {(porDia.get(dia)?.citas ?? []).length === 0 &&
                    (porDia.get(dia)?.bloqueos ?? []).length === 0 &&
                    (!franja || huecos.length === 0) ? (
                      <li className="rounded-xl bg-sand-50 px-3 py-3 text-sm text-ink-500">Sin ocupación</li>
                    ) : null}
                  </ul>
                </section>
              );
            })}
          </div>

          <aside className="h-fit space-y-5">
            <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
              <h2 className="font-display text-base font-bold text-ink-900">
                Nueva reserva presencial
              </h2>
              <FormPresencial fechaHoy={diaLima(0)} variantes={variantesFiltradas} />
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
              <h2 className="font-display text-base font-bold text-ink-900">Bloquear horario</h2>
              <FormBloqueo fechaHoy={diaLima(0)} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function tipoBloqueoTexto(tipo: string): string {
  return TIPO_BLOQUEO[tipo] ?? tipo;
}

type VarianteAdmin = {
  id: string;
  duration_minutes: number;
  amount_cents: number;
  service: unknown;
};

function FormPresencial({
  fechaHoy,
  variantes,
}: {
  fechaHoy: string;
  variantes: VarianteAdmin[];
}) {
  return (
    <form action={registrarPresencial} className="mt-3 flex flex-col gap-2.5">
      <select id="adm-variant" name="variant_id" aria-label="Servicio y duración" required className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm">
        {variantes.map((v) => {
          const servicio = v.service as unknown as { name: string };
          return (
            <option key={v.id} value={v.id}>
              {servicio.name} — {v.duration_minutes} min — {formatPenCorta(v.amount_cents)}
            </option>
          );
        })}
      </select>
      <div className="flex gap-2">
        <input id="adm-fecha" name="fecha" type="date" required defaultValue={fechaHoy} aria-label="Fecha" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
        <input id="adm-hora" name="hora" type="time" required aria-label="Hora" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
      </div>
      <HorasDisponibles />
      <select name="origen" aria-label="Origen de la reserva" defaultValue="IN_PERSON" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm">
        <option value="IN_PERSON">Presencial</option>
        <option value="WHATSAPP">WhatsApp</option>
        <option value="PHONE">Teléfono</option>
      </select>
      <input name="nombre" required minLength={2} maxLength={80} placeholder="Nombre completo" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
      <input name="telefono" required pattern="9\d{8}" maxLength={9} inputMode="numeric" placeholder="Celular 9XXXXXXXX (si ya es paciente, se reutiliza)" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
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
  );
}

function FormBloqueo({ fechaHoy }: { fechaHoy: string }) {
  return (
    <form action={bloquearHorario} className="mt-3 flex flex-col gap-2.5">
      <div className="flex gap-2">
        <input name="fecha" type="date" required defaultValue={fechaHoy} aria-label="Fecha del bloqueo" className="w-1/2 rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm" />
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
  );
}

function formatPenCorta(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}
