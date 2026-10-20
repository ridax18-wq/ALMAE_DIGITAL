import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ETIQUETAS_ESTADO, ESTADOS_FILTRO } from "@/lib/services/estados";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reservas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type FilaReserva = {
  id: string;
  status: string;
  starts_at: string;
  total_amount: number;
  advance_amount: number;
  patient_id: string;
  service_id: string;
};

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("bookings")
    .select("id, status, starts_at, total_amount, advance_amount, patient_id, service_id")
    .order("starts_at", { ascending: false })
    .limit(100);

  if (estado && ESTADOS_FILTRO.includes(estado as (typeof ESTADOS_FILTRO)[number])) {
    consulta = consulta.eq("status", estado);
  }

  const { data: reservas } = await consulta;

  const idsPacientes = Array.from(
    new Set((reservas ?? []).map((r) => String(r.patient_id))),
  );
  const idsServicios = Array.from(
    new Set((reservas ?? []).map((r) => String(r.service_id))),
  );

  const { data: pacientes } = idsPacientes.length
    ? await supabase
        .from("patients")
        .select("id, full_name, phone")
        .in("id", idsPacientes)
    : { data: [] };

  const { data: servicios } = idsServicios.length
    ? await supabase
        .from("services")
        .select("id, name")
        .in("id", idsServicios)
    : { data: [] };

  const nombrePaciente = new Map(
    (pacientes ?? []).map((p) => [String(p.id), { nombre: p.full_name, telefono: p.phone }]),
  );
  const nombreServicio = new Map(
    (servicios ?? []).map((s) => [String(s.id), s.name]),
  );

  const termBusqueda = q?.trim().toLowerCase() ?? "";
  const reservasFiltradas = (reservas as unknown as FilaReserva[] | null ?? []).filter(
    (r) => {
      if (!termBusqueda) return true;
      const paciente = nombrePaciente.get(String(r.patient_id));
      return (
        (paciente?.nombre ?? "").toLowerCase().includes(termBusqueda) ||
        (paciente?.telefono ?? "").includes(termBusqueda)
      );
    },
  );

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Reservas</h1>
            <p className="mt-1 text-sm text-ink-500">
              {reservasFiltradas.length} reservas (últimas 100)
            </p>
          </div>
          <form className="flex gap-2" action="/admin/reservas">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre o teléfono"
              aria-label="Buscar reservas"
              className="w-64 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Buscar
            </button>
          </form>
        </div>

        <nav aria-label="Filtro por estado" className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/reservas"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              !estado
                ? "bg-brand-700 text-white"
                : "border border-sand-200 bg-white text-ink-700 hover:bg-sand-100"
            }`}
          >
            Todas
          </Link>
          {ESTADOS_FILTRO.map((e) => (
            <Link
              key={e}
              href={`/admin/reservas?estado=${e}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                estado === e
                  ? "bg-brand-700 text-white"
                  : "border border-sand-200 bg-white text-ink-700 hover:bg-sand-100"
              }`}
            >
              {ETIQUETAS_ESTADO[e]?.texto ?? e}
            </Link>
          ))}
        </nav>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2.5">Fecha / hora</th>
                <th className="px-4 py-2.5">Paciente</th>
                <th className="px-4 py-2.5">Servicio</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Adelanto</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {reservasFiltradas.map((reserva) => {
                const estadoInfo = ETIQUETAS_ESTADO[reserva.status] ?? {
                  texto: reserva.status,
                  clases: "border-sand-200 bg-sand-100 text-ink-700",
                };
                const paciente = nombrePaciente.get(String(reserva.patient_id));
                return (
                  <tr key={reserva.id} className="hover:bg-sand-50">
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-ink-900">
                      {String(reserva.starts_at).slice(0, 10)}{" "}
                      {String(reserva.starts_at).slice(11, 16)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium text-ink-900">
                        {paciente?.nombre}
                      </span>
                      <span className="text-xs text-ink-500">{paciente?.telefono}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {nombreServicio.get(String(reserva.service_id))}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${estadoInfo.clases}`}
                      >
                        {estadoInfo.texto}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{formatPen(reserva.advance_amount)}</td>
                    <td className="px-4 py-2.5">{formatPen(reserva.total_amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/admin/reservas/${reserva.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {reservasFiltradas.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink-500" colSpan={7}>
                    Sin reservas para este filtro
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
