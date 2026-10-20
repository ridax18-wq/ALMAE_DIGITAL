import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function hoyLimaISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
  }).format(new Date());
}

function inicioDeMesISO(): string {
  return `${hoyLimaISO().slice(0, 7)}-01`;
}

function Card({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
      <p className="text-xs font-bold tracking-[0.14em] uppercase text-ink-500">
        {titulo}
      </p>
      <p className="mt-1.5 font-display text-2xl font-extrabold text-ink-900">
        {valor}
      </p>
      {detalle ? <p className="mt-1 text-xs text-ink-500">{detalle}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const hoy = hoyLimaISO();

  const [{ data: reservas }, { data: pagos }, { data: pacientes }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, starts_at, ends_at, total_amount, advance_amount, marketing_source_id, patient_id, created_at")
        .order("starts_at"),
      supabase
        .from("payments")
        .select("id, status, amount, currency, occurred_at, created_at"),
      supabase.from("patients").select("id, full_name, phone, created_at"),
    ]);

  const reservasT = reservas ?? [];
  const pagosT = pagos ?? [];
  const pacientesT = pacientes ?? [];

  const enRangoLima = (isoLima: string, desde: string, hasta: string) => {
    const fecha = isoLima.slice(0, 10);
    return fecha >= desde && (hasta ? fecha <= hasta : true);
  };

  const deHoy = reservasT.filter((r) =>
    enRangoLima(String(r.starts_at), hoy, hoy),
  );
  const citasHoy = deHoy.filter((r) =>
    ["CONFIRMED", "COMPLETED"].includes(r.status),
  ).length;
  const confirmadasHoy = deHoy.filter((r) => r.status === "CONFIRMED").length;
  const pendientesVigentes = reservasT.filter(
    (r) =>
      ["HELD", "PENDING_PAYMENT"].includes(r.status) &&
      new Date(String(r.ends_at)) > new Date(),
  ).length;
  const canceladasMes = reservasT.filter(
    (r) =>
      r.status === "CANCELLED" &&
      enRangoLima(String(r.created_at), inicioDeMesISO(), hoy),
  ).length;

  const pagadosApp = pagosT.filter((p) => p.status === "SUCCEEDED");
  const pagadosMes = pagadosApp.filter((p) =>
    enRangoLima(String(p.occurred_at ?? p.created_at), inicioDeMesISO(), hoy),
  );
  const adelantosMes = pagadosMes.reduce((t, p) => t + Number(p.amount), 0);

  const saldosPendientes = reservasT
    .filter(
      (r) =>
        r.status === "CONFIRMED" &&
        new Date(String(r.starts_at)) > new Date(),
    )
    .reduce((t, r) => t + (Number(r.total_amount) - Number(r.advance_amount)), 0);

  const pacientesNuevosMes = pacientesT.filter((p) =>
    enRangoLima(String(p.created_at), inicioDeMesISO(), hoy),
  ).length;

  const idsPacientesConReserva = new Set(
    reservasT.map((r) => String(r.patient_id)),
  );
  const pacientesRecurrentes = Array.from(
    idsPacientesConReserva,
  ).filter((pid) => {
    const total = reservasT.filter(
      (r) => String(r.patient_id) === pid,
    ).length;
    return total > 1;
  }).length;

  const noShowsMes = reservasT.filter(
    (r) =>
      r.status === "NO_SHOW" &&
      enRangoLima(String(r.starts_at), inicioDeMesISO(), hoy),
  ).length;
  const completadasMes = reservasT.filter(
    (r) =>
      r.status === "COMPLETED" &&
      enRangoLima(String(r.starts_at), inicioDeMesISO(), hoy),
  ).length;
  const tasaNoShow =
    noShowsMes + completadasMes > 0
      ? `${Math.round((noShowsMes / (noShowsMes + completadasMes)) * 100)}%`
      : "—";

  const porOrigen = new Map<string, { reservas: number; pagadas: number }>();
  const nombreOrigen = new Map<string, string>();
  const { data: fuentes } = await supabase
    .from("marketing_sources")
    .select("id, name");
  for (const f of fuentes ?? []) nombreOrigen.set(String(f.id), f.name);

  for (const r of reservasT) {
    const key = r.marketing_source_id ? String(r.marketing_source_id) : "sin_origen";
    const actual = porOrigen.get(key) ?? { reservas: 0, pagadas: 0 };
    actual.reservas += 1;
    if (["CONFIRMED", "COMPLETED"].includes(r.status)) {
      actual.pagadas += 1;
    }
    porOrigen.set(key, actual);
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Indicadores de registros reales · {hoy} (America/Lima)
        </p>

        <section aria-label="Citas de hoy" className="mt-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Citas de hoy
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card titulo="Citas activas de hoy" valor={String(citasHoy)} />
            <Card titulo="Confirmadas hoy" valor={String(confirmadasHoy)} />
            <Card titulo="Pendientes (vigentes)" valor={String(pendientesVigentes)} />
            <Card titulo="Canceladas (mes)" valor={String(canceladasMes)} />
          </div>
        </section>

        <section aria-label="Pacientes" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Pacientes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card titulo="Pacientes registrados" valor={String(pacientesT.length)} />
            <Card titulo="Nuevos (mes)" valor={String(pacientesNuevosMes)} />
            <Card titulo="Recurrentes" valor={String(pacientesRecurrentes)} />
            <Card titulo="Tasa de inasistencia (mes)" valor={tasaNoShow} />
          </div>
        </section>

        <section aria-label="Dinero" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Dinero
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card titulo="Adelantos cobrados (mes)" valor={formatPen(adelantosMes)} />
            <Card titulo="Saldos por cobrar en consultorio" valor={formatPen(saldosPendientes)} />
            <Card titulo="Pagos acreditados (mes)" valor={String(pagadosMes.length)} detalle="pagos SUCCEEDED" />
          </div>
        </section>

        <section aria-label="Reservas por origen" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Reservas por origen comercial
          </h2>
          <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2.5">Origen</th>
                  <th className="px-4 py-2.5">Reservas</th>
                  <th className="px-4 py-2.5">Pagadas/confirmadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {Array.from(porOrigen.entries()).map(([key, datos]) => (
                  <tr key={key}>
                    <td className="px-4 py-2.5 font-medium text-ink-900">
                      {key === "sin_origen" ? "Sin origen registrado" : (nombreOrigen.get(key) ?? key)}
                    </td>
                    <td className="px-4 py-2.5">{datos.reservas}</td>
                    <td className="px-4 py-2.5">{datos.pagadas}</td>
                  </tr>
                ))}
                {porOrigen.size === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-ink-500" colSpan={3}>
                      Aún no hay reservas registradas
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Los saldos se refieren a pagos del adelanto en PEN; los ingresos por
            saldo en consultorio se registran como pagos manuales.
          </p>
        </section>
      </div>
    </main>
  );
}
