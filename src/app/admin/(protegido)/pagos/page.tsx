import type { Metadata } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pagos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const supabase = createSupabaseServiceClient();

  const { data: pagos } = await supabase
    .from("payments")
    .select(
      "id, provider, external_reference, amount, currency, status, method, occurred_at, created_at, booking_id",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: conciliaciones } = await supabase
    .from("payment_reconciliation")
    .select("id, reason, note, created_at, payment_id")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  const idsReserva = Array.from(
    new Set(
      (pagos ?? [])
        .map((p) => String(p.booking_id ?? ""))
        .filter((id) => id.length > 0),
    ),
  );

  const { data: reservas } = idsReserva.length
    ? await supabase
        .from("bookings")
        .select("id, patient_id")
        .in("id", idsReserva)
    : { data: [] };

  const pacientePorReserva = new Map(
    (reservas ?? []).map((r) => [String(r.id), String(r.patient_id)]),
  );

  const idsPacientes = Array.from(new Set(pacientePorReserva.values()));

  const { data: pacientes } = idsPacientes.length
    ? await supabase
        .from("patients")
        .select("id, full_name")
        .in("id", idsPacientes)
    : { data: [] };

  const nombrePaciente = new Map(
    (pacientes ?? []).map((p) => [String(p.id), p.full_name]),
  );

  const pagoPorId = new Map((pagos ?? []).map((p) => [String(p.id), p]));

  const nombreDePago = (paymentId: string): string => {
    const pago = pagoPorId.get(paymentId);
    if (!pago?.booking_id) return "Sin reserva";
    return (
      nombrePaciente.get(pacientePorReserva.get(String(pago.booking_id)) ?? "") ??
      "Paciente"
    );
  };

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Pagos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Adelantos y pagos manuales · los pagos manuales se registran desde el
          detalle de cada reserva
        </p>

        <section aria-label="Conciliaciones pendientes" className="mt-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Conciliaciones pendientes ({(conciliaciones ?? []).length})
          </h2>
          <ul className="divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white shadow-xs">
            {(conciliaciones ?? []).map((c) => {
              const pago = pagoPorId.get(String(c.payment_id));
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium text-ink-900">
                    {nombreDePago(String(c.payment_id))} ·{" "}
                    {formatPen(Number(pago?.amount ?? 0))} ({pago?.currency})
                  </span>
                  <span className="flex items-center gap-3 text-xs text-ink-500">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">
                      {c.reason}
                    </span>
                    {String(c.created_at).slice(0, 16).replace("T", " ")}
                  </span>
                </li>
              );
            })}
            {(conciliaciones ?? []).length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-ink-500">
                No hay casos de conciliación pendientes
              </li>
            ) : null}
          </ul>
        </section>

        <section aria-label="Historial de pagos" className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-ink-700">
            Historial de pagos
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Paciente</th>
                  <th className="px-4 py-2.5">Monto</th>
                  <th className="px-4 py-2.5">Proveedor</th>
                  <th className="px-4 py-2.5">Método</th>
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {(pagos ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-sand-50">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {String(p.occurred_at ?? p.created_at).slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.booking_id
                        ? (nombrePaciente.get(pacientePorReserva.get(String(p.booking_id)) ?? "") ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-ink-900">
                      {formatPen(Number(p.amount))}
                    </td>
                    <td className="px-4 py-2.5">{p.provider}</td>
                    <td className="px-4 py-2.5">{p.method || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "SUCCEEDED"
                            ? "border border-green-200 bg-green-50 text-green-900"
                            : ["FAILED", "EXPIRED"].includes(p.status)
                              ? "border border-sand-200 bg-sand-100 text-ink-700"
                              : "border border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(pagos ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-ink-500" colSpan={6}>
                      Sin pagos registrados
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
