import type { Metadata } from "next";
import Link from "next/link";
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

function inicioSemanaLima(): number {
  const d = new Date();
  const weekday = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", weekday: "short" })
      .format(d)
      .replace("Sun", "0")
      .replace("Mon", "1")
      .replace("Tue", "2")
      .replace("Wed", "3")
      .replace("Thu", "4")
      .replace("Fri", "5")
      .replace("Sat", "6"),
  );
  return d.getDate() - weekday;
}

function fechaPorOffset(diasDesdeSemanaInicio: number): string {
  const d = new Date();
  d.setDate(inicioSemanaLima() + diasDesdeSemanaInicio);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string }>;
}) {
  const { fecha: fechaParam, vista: vistaParam } = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam ?? "") ? (fechaParam ?? diaLima(0)) : diaLima(0);
  const vista = vistaParam === "semana" ? "semana" : "dia";

  const supabase = createSupabaseServiceClient();

  const esSemana = vista === "semana";
  const desdeFecha = esSemana ? fechaPorOffset(0) : fecha;
  const hastaFecha = esSemana ? fechaPorOffset(6) : fecha;

  const desdeUtc = new Date(`${desdeFecha}T00:00:00-05:00`).toISOString();
  const hastaUtcFinal = new Date(
    new Date(`${hastaFecha}T00:00:00-05:00`).getTime() + 24 * 60 * 60_000,
  ).toISOString();

  const { data: reservas } = await supabase
    .from("bookings")
    .select("id, status, starts_at, ends_at, total_amount, patient_id, service_id")
    .in("status", ["HELD", "PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "NO_SHOW"])
    .gte("starts_at", desdeUtc)
    .lt("starts_at", hastaUtcFinal)
    .order("starts_at");

  const idsPacientes = Array.from(
    new Set((reservas ?? []).map((r) => String(r.patient_id))),
  );
  const idsServicios = Array.from(
    new Set((reservas ?? []).map((r) => String(r.service_id))),
  );

  const { data: pacientes } = idsPacientes.length
    ? await supabase.from("patients").select("id, full_name").in("id", idsPacientes)
    : { data: [] };

  const { data: servicios } = idsServicios.length
    ? await supabase.from("services").select("id, name").in("id", idsServicios)
    : { data: [] };

  const nombrePaciente = new Map((pacientes ?? []).map((p) => [String(p.id), p.full_name]));
  const nombreServicio = new Map((servicios ?? []).map((s) => [String(s.id), s.name]));

  const dias = esSemana
    ? Array.from({ length: 7 }, (_, i) => fechaPorOffset(i))
    : [fecha];

  const porDia = new Map<string, NonNullable<typeof reservas>>();
  for (const dia of dias) porDia.set(dia, []);
  for (const reserva of reservas ?? []) {
    const dia = String(reserva.starts_at).slice(0, 10);
    porDia.get(dia)?.push(reserva);
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
          <div className="flex gap-2">
            <Link
              href={`/admin/agenda?vista=dia&fecha=${fecha}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${!esSemana ? "bg-brand-700 text-white" : "border border-sand-200 bg-white text-ink-700 hover:bg-sand-100"}`}
            >
              Día
            </Link>
            <Link
              href={`/admin/agenda?vista=semana&fecha=${desdeFecha}`}
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

        <div className={esSemana ? "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" : "mt-6"}>
          {dias.map((dia) => (
            <section key={dia} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
              <h2 className="font-display text-base font-bold text-ink-900">
                {dia}
                {dia === diaLima(0) ? (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">
                    hoy
                  </span>
                ) : null}
              </h2>
              <ul className="mt-3 space-y-2">
                {(porDia.get(dia) ?? []).map((reserva) => {
                  const estadoInfo = ETIQUETAS_ESTADO[reserva.status] ?? {
                    texto: reserva.status,
                    clases: "border-sand-200 bg-sand-100 text-ink-700",
                  };
                  return (
                    <li key={reserva.id}>
                      <Link
                        href={`/admin/reservas/${reserva.id}`}
                        className="block rounded-xl border border-sand-200 px-3 py-2.5 hover:border-brand-400 hover:bg-brand-50"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink-900">
                            {formatHorarioLima(String(reserva.starts_at), String(reserva.ends_at))}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estadoInfo.clases}`}>
                            {estadoInfo.texto}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-900">
                          {nombrePaciente.get(String(reserva.patient_id))} ·{" "}
                          {nombreServicio.get(String(reserva.service_id))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {(porDia.get(dia) ?? []).length === 0 ? (
                  <li className="rounded-xl bg-sand-50 px-3 py-3 text-sm text-ink-500">
                    Sin citas
                  </li>
                ) : null}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
