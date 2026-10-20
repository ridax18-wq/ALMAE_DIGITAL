import type { Metadata } from "next";
import Link from "next/link";
import { verificarPagoPage, rechazarPagoPage } from "@/app/admin/(protegido)/pagos/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pagos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ETIQUETA_ESTADO_PAGO: Record<string, { texto: string; clases: string }> = {
  REPORTED: { texto: "REPORTED (por verificar)", clases: "border-amber-200 bg-amber-50 text-amber-900" },
  VERIFIED: { texto: "VERIFIED", clases: "border-green-200 bg-green-50 text-green-900" },
  REJECTED: { texto: "REJECTED", clases: "border-red-200 bg-red-50 text-red-900" },
};

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorUrl } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const { data: adelantos } = await supabase
    .from("manual_payments")
    .select(
      "id, method, amount_cents, verification_status, transaction_reference, paid_at, verified_at, rejection_reason, created_at, booking:bookings(id, public_code, status, patient:patients(full_name, phone))",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const filas = (adelantos ?? []).map((a) => {
    const reserva = (a.booking as unknown as { id: string; public_code: string; status: string; patient: { full_name: string; phone: string } } | null) ?? null;
    return { adelanto: a, reserva };
  });

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Pagos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Adelantos manuales coordinados por WhatsApp · un pago REPORTED no es
          un pago verificado
        </p>

        {errorUrl ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorUrl)}
          </p>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2.5">Fecha registro</th>
                <th className="px-4 py-2.5">Paciente</th>
                <th className="px-4 py-2.5">Reserva</th>
                <th className="px-4 py-2.5">Monto</th>
                <th className="px-4 py-2.5">Método</th>
                <th className="px-4 py-2.5">Referencia</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {filas.map(({ adelanto, reserva }) => {
                const etiqueta = ETIQUETA_ESTADO_PAGO[adelanto.verification_status] ?? {
                  texto: adelanto.verification_status,
                  clases: "border-sand-200 bg-sand-100 text-ink-700",
                };
                return (
                  <tr key={adelanto.id} className="hover:bg-sand-50">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {String(adelanto.created_at).slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink-900">{reserva?.patient?.full_name ?? "—"}</span>
                      <span className="block text-xs text-ink-500">{reserva?.patient?.phone ?? ""}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/reservas/${reserva?.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                        {reserva?.public_code ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-ink-900">{formatPen(adelanto.amount_cents)}</td>
                    <td className="px-4 py-2.5">{adelanto.method}</td>
                    <td className="px-4 py-2.5 text-xs">{adelanto.transaction_reference || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${etiqueta.clases}`}>
                        {etiqueta.texto}
                      </span>
                      {adelanto.rejection_reason ? (
                        <span className="block text-[11px] text-ink-500">{adelanto.rejection_reason}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      {adelanto.verification_status === "REPORTED" ? (
                        <span className="flex items-center gap-1.5">
                          <form action={verificarPagoPage}>
                            <input type="hidden" name="payment_id" value={adelanto.id} />
                            <input type="hidden" name="booking_id" value={reserva?.id ?? ""} />
                            <button type="submit" className="rounded-lg bg-brand-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">
                              Verificar
                            </button>
                          </form>
                          <form action={rechazarPagoPage} className="flex items-center gap-1">
                            <input type="hidden" name="payment_id" value={adelanto.id} />
                            <input name="motivo" placeholder="motivo" className="w-20 rounded-lg border border-sand-200 px-2 py-1.5 text-xs" />
                            <button type="submit" className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50">
                              Rechazar
                            </button>
                          </form>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink-500" colSpan={8}>
                    Sin adelantos registrados
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
