import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ETIQUETAS_ESTADO, ESTADOS_FILTRO } from "@/lib/services/estados";
import { formatPen } from "@/lib/format";
import {
  clasificarReserva,
  ordenarPorVencimiento,
  puedeConfirmarse,
  saldoPendienteCents,
} from "@/lib/services/bandeja-reservas";
import { aprobarConfirmacion } from "@/app/admin/(protegido)/reservas/actions";
import { BotonConfirmar } from "@/app/admin/(protegido)/reservas/BotonConfirmar";
import { ActualizadorBandeja } from "@/app/admin/(protegido)/reservas/ActualizadorBandeja";
import { ContadorRestante } from "@/app/admin/(protegido)/reservas/ContadorRestante";

export const metadata: Metadata = {
  title: "Reservas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function instanteServidor(): number {
  return new Date().getTime();
}

type FilaReserva = {
  id: string;
  status: string;
  starts_at: string;
  amount_cents: number;
  deposit_required_cents: number;
  patient_id: string;
  service_id: string;
};

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; confirmada?: string; error?: string }>;
}) {
  const { estado, q, confirmada, error: errorUrl } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("bookings")
    .select("id, status, starts_at, amount_cents, deposit_required_cents, patient_id, service_id")
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

  const { data: retenidas } = await supabase
    .from("bookings")
    .select("id, public_code, starts_at, hold_expires_at, amount_cents, deposit_required_cents, patient_id, service_id, status")
    .eq("status", "HELD")
    .order("hold_expires_at", { ascending: true })
    .limit(50);

  const idsPendientes = (retenidas ?? []).map((r) => String(r.id));
  const { data: adelantosPendientes } = idsPendientes.length
    ? await supabase
        .from("manual_payments")
        .select("booking_id, amount_cents, verification_status")
        .in("booking_id", idsPendientes)
    : { data: [] };

  const verificadoPorReserva = new Map<string, number>();
  const reportadoPorReserva = new Map<string, number>();
  for (const pago of adelantosPendientes ?? []) {
    const clave = String(pago.booking_id);
    if (pago.verification_status === "VERIFIED") {
      verificadoPorReserva.set(clave, (verificadoPorReserva.get(clave) ?? 0) + Number(pago.amount_cents));
    } else if (pago.verification_status === "REPORTED") {
      reportadoPorReserva.set(clave, (reportadoPorReserva.get(clave) ?? 0) + Number(pago.amount_cents));
    }
  }

  const ahoraMs = instanteServidor();
  const pendientes = ordenarPorVencimiento(
    (retenidas ?? []).map((r) => ({
      ...r,
      vencimientoIso: r.hold_expires_at,
      clase: clasificarReserva(r.status, r.hold_expires_at, ahoraMs),
      verificado: verificadoPorReserva.get(String(r.id)) ?? 0,
      reportado: reportadoPorReserva.get(String(r.id)) ?? 0,
    })),
  ).filter((r) => r.clase === "PENDIENTE" || r.clase === "PROXIMA_A_VENCER");

  const idsPendientesPaciente = Array.from(new Set(pendientes.map((p) => String(p.patient_id))));
  const { data: pacientesPendientes } = idsPendientesPaciente.length
    ? await supabase.from("patients").select("id, full_name").in("id", idsPendientesPaciente)
    : { data: [] };
  const nombrePacientePendiente = new Map(
    (pacientesPendientes ?? []).map((p) => [String(p.id), p.full_name]),
  );

  return (
    <main className="py-8">
      <ActualizadorBandeja />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {confirmada ? (
          <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Cita confirmada correctamente.
          </p>
        ) : null}
        {errorUrl ? (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorUrl)}
          </p>
        ) : null}
        <section aria-labelledby="pendientes" className="mb-8">
          <h2 id="pendientes" className="font-display text-xl font-bold text-ink-900">
            Pendientes de confirmación
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Horarios separados que aún no tienen adelanto verificado. Se actualiza cada 15 segundos.
          </p>
          {pendientes.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-sand-200 bg-white p-6 text-center text-sm text-ink-500">
              No tienes reservas pendientes.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
              <table className="w-full text-sm">
                <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
                  <tr>
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Paciente</th>
                    <th className="px-4 py-2.5">Servicio</th>
                    <th className="px-4 py-2.5">Fecha y hora</th>
                    <th className="px-4 py-2.5">Adelanto requerido</th>
                    <th className="px-4 py-2.5">Verificado</th>
                    <th className="px-4 py-2.5">Saldo pendiente</th>
                    <th className="px-4 py-2.5">Tiempo restante</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {pendientes.map((p) => (
                    <tr key={p.id} className="hover:bg-sand-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{p.public_code}</td>
                      <td className="px-4 py-2.5">{nombrePacientePendiente.get(String(p.patient_id))}</td>
                      <td className="px-4 py-2.5">{nombreServicio.get(String(p.service_id))}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {String(p.starts_at).slice(0, 10)} {String(p.starts_at).slice(11, 16)}
                      </td>
                      <td className="px-4 py-2.5">{formatPen(p.deposit_required_cents)}</td>
                      <td className="px-4 py-2.5">
                        {formatPen(p.verificado)}
                        {p.reportado > 0 ? (
                          <span className="block text-xs text-amber-800">
                            Reportado sin verificar: {formatPen(p.reportado)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        {formatPen(saldoPendienteCents(p.deposit_required_cents, p.verificado))}
                      </td>
                      <td className="px-4 py-2.5">
                        {p.vencimientoIso ? <ContadorRestante vencimientoIso={p.vencimientoIso} /> : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            p.clase === "PROXIMA_A_VENCER"
                              ? "border-red-200 bg-red-50 text-red-900"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {p.clase === "PROXIMA_A_VENCER" ? "Próxima a vencer" : "Pendiente de confirmación"}
                        </span>
                        {puedeConfirmarse(p.clase) && p.verificado >= p.deposit_required_cents ? (
                          <span className="block text-xs text-green-900">Adelanto verificado: lista para confirmar</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col items-start gap-1.5">
                          <form action={aprobarConfirmacion}>
                            <input type="hidden" name="booking_id" value={p.id} />
                            <input type="hidden" name="retorno" value="/admin/reservas" />
                            <BotonConfirmar
                              habilitado={puedeConfirmarse(p.clase) && p.verificado >= p.deposit_required_cents}
                            />
                          </form>
                          <Link
                            href={`/admin/reservas/${p.id}`}
                            className="text-xs font-semibold text-brand-700 hover:underline"
                          >
                            Ver detalle
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
                    <td className="px-4 py-2.5">{formatPen(reserva.deposit_required_cents)}</td>
                    <td className="px-4 py-2.5">{formatPen(reserva.amount_cents)}</td>
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
