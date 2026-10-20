import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function hoyLimaISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

function inicioDeMesISO(): string {
  return `${hoyLimaISO().slice(0, 7)}-01`;
}

function Card({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
      <p className="text-xs font-bold tracking-[0.14em] uppercase text-ink-500">{titulo}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold text-ink-900">{valor}</p>
      {detalle ? <p className="mt-1 text-xs text-ink-500">{detalle}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const hoy = hoyLimaISO();
  const mesInicio = inicioDeMesISO();

  const [{ data: reservas }, { data: adelantos }, { data: pacientes }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, origin, starts_at, ends_at, amount_cents, deposit_required_cents, hold_expires_at, created_at, patient_id")
        .order("starts_at"),
      supabase
        .from("manual_payments")
        .select("id, amount_cents, verification_status, verified_at"),
      supabase.from("patients").select("id, full_name, created_at"),
    ]);

  const reservasT = reservas ?? [];
  const adelantosT = adelantos ?? [];
  const pacientesT = pacientes ?? [];

  const fechaLima = (iso: string): string => String(iso).slice(0, 10);

  const deHoy = reservasT.filter((r) => fechaLima(String(r.starts_at)) === hoy);
  const citasHoy = deHoy.filter((r) => ["CONFIRMED", "COMPLETED"].includes(r.status)).length;
  const confirmadasHoy = deHoy.filter((r) => r.status === "CONFIRMED").length;
  const presencialesHoy = deHoy.filter((r) => r.origin === "IN_PERSON").length;

  const ahora = new Date();
  const retencionesVigentes = reservasT.filter(
    (r) => r.status === "HELD" && r.hold_expires_at && new Date(String(r.hold_expires_at)) > ahora,
  );
  const proximasAVencer = retencionesVigentes.filter(
    (r) => new Date(String(r.hold_expires_at)) <= new Date(ahora.getTime() + 5 * 60_000),
  ).length;

  const canceladasMes = reservasT.filter(
    (r) => r.status === "CANCELLED" && fechaLima(String(r.created_at)) >= mesInicio,
  ).length;

  const verificadosMes = adelantosT.filter(
    (a) => a.verification_status === "VERIFIED" && a.verified_at && fechaLima(String(a.verified_at)) >= mesInicio,
  );
  const adelantosVerificadosCents = verificadosMes.reduce((t, a) => t + Number(a.amount_cents), 0);

  const saldosPendientesCents = reservasT
    .filter((r) => r.status === "CONFIRMED" && new Date(String(r.starts_at)) > ahora)
    .reduce((t, r) => t + (Number(r.amount_cents) - Number(r.deposit_required_cents)), 0);

  const pacientesNuevosMes = pacientesT.filter(
    (p) => fechaLima(String(p.created_at)) >= mesInicio,
  ).length;

  const idsPacientesConReserva = new Set(reservasT.map((r) => String(r.patient_id)));
  const pacientesRecurrentes = Array.from(idsPacientesConReserva).filter(
    (pid) => reservasT.filter((r) => String(r.patient_id) === pid).length > 1,
  ).length;

  const noShowsMes = reservasT.filter(
    (r) => r.status === "NO_SHOW" && fechaLima(String(r.starts_at)) >= mesInicio,
  ).length;
  const completadasMes = reservasT.filter(
    (r) => r.status === "COMPLETED" && fechaLima(String(r.starts_at)) >= mesInicio,
  ).length;
  const tasaNoShow =
    noShowsMes + completadasMes > 0
      ? `${Math.round((noShowsMes / (noShowsMes + completadasMes)) * 100)}%`
      : "—";

  const origenesAgenda = new Map<string, { reservas: number; confirmadas: number }>();
  for (const r of reservasT) {
    const origen = r.origin === "IN_PERSON" ? "Presencial" : "Web";
    const fila = origenesAgenda.get(origen) ?? { reservas: 0, confirmadas: 0 };
    fila.reservas += 1;
    if (["CONFIRMED", "COMPLETED"].includes(r.status)) fila.confirmadas += 1;
    origenesAgenda.set(origen, fila);
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">
          Indicadores de registros reales · {hoy} (America/Lima)
        </p>

        <section aria-label="Citas de hoy" className="mt-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">Citas de hoy</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card titulo="Citas activas de hoy" valor={String(citasHoy)} />
            <Card titulo="Confirmadas hoy" valor={String(confirmadasHoy)} />
            <Card titulo="Presenciales hoy" valor={String(presencialesHoy)} />
            <Card titulo="Canceladas (mes)" valor={String(canceladasMes)} />
          </div>
        </section>

        <section aria-label="Retenciones" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">Retenciones web</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card titulo="Retenciones vigentes" valor={String(retencionesVigentes.length)} detalle="HELD no vencidas" />
            <Card titulo="Próximas a vencer (≤5 min)" valor={String(proximasAVencer)} />
          </div>
        </section>

        <section aria-label="Pacientes" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">Pacientes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card titulo="Pacientes registrados" valor={String(pacientesT.length)} />
            <Card titulo="Nuevos (mes)" valor={String(pacientesNuevosMes)} />
            <Card titulo="Recurrentes" valor={String(pacientesRecurrentes)} />
            <Card titulo="Tasa de inasistencia (mes)" valor={tasaNoShow} />
          </div>
        </section>

        <section aria-label="Dinero" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">Dinero</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card titulo="Adelantos verificados (mes)" valor={formatPen(adelantosVerificadosCents)} />
            <Card titulo="Saldos por cobrar en consultorio" valor={formatPen(saldosPendientesCents)} />
          </div>
        </section>

        <section aria-label="Reservas por origen" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Reservas por origen de agenda
          </h2>
          <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2.5">Origen</th>
                  <th className="px-4 py-2.5">Reservas</th>
                  <th className="px-4 py-2.5">Confirmadas/completadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {Array.from(origenesAgenda.entries()).map(([origen, datos]) => (
                  <tr key={origen}>
                    <td className="px-4 py-2.5 font-medium text-ink-900">{origen}</td>
                    <td className="px-4 py-2.5">{datos.reservas}</td>
                    <td className="px-4 py-2.5">{datos.confirmadas}</td>
                  </tr>
                ))}
                {origenesAgenda.size === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-ink-500" colSpan={3}>
                      Aún no hay reservas registradas
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
