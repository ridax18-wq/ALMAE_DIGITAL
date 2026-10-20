import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reportes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type FilaReserva = {
  id: string;
  status: string;
  total_amount: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  marketing_source_id: string | null;
  created_at: string;
};

export default async function ReportesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: reservas }, { data: fuentes }, { data: pagos }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, status, total_amount, utm_source, utm_medium, utm_campaign, marketing_source_id, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("marketing_sources").select("id, name, kind"),
      supabase
        .from("payments")
        .select("amount, status, occurred_at, booking_id"),
    ]);

  const nombreFuente = new Map<string, string>();
  for (const f of fuentes ?? []) nombreFuente.set(String(f.id), f.name);

  const pagosPorReserva = new Map<string, number>();
  for (const p of pagos ?? []) {
    if (p.status === "SUCCEEDED" && p.booking_id) {
      pagosPorReserva.set(
        String(p.booking_id),
        (pagosPorReserva.get(String(p.booking_id)) ?? 0) + Number(p.amount),
      );
    }
  }

  type FilaOrigen = { clave: string; nombre: string; reservas: number; pagadas: number; ingresos: number };
  const filas = new Map<string, FilaOrigen>();

  function acumular(clave: string, nombre: string, reserva: FilaReserva): void {
    const fila = filas.get(clave) ?? { clave, nombre, reservas: 0, pagadas: 0, ingresos: 0 };
    fila.reservas += 1;
    const cobrado = pagosPorReserva.get(String(reserva.id)) ?? 0;
    if (cobrado > 0) fila.pagadas += 1;
    fila.ingresos += cobrado;
    filas.set(clave, fila);
  }

  const reservasF = (reservas ?? []) as unknown as FilaReserva[];

  for (const r of reservasF) {
    if (r.marketing_source_id) {
      const key = String(r.marketing_source_id);
      acumular(key, nombreFuente.get(key) ?? key, r);
    } else if (r.utm_campaign || r.utm_source) {
      const clave = `utm:${r.utm_source ?? ""}/${r.utm_campaign ?? ""}`;
      acumular(clave, `UTM ${r.utm_source ?? ""} / ${r.utm_campaign ?? ""}`, r);
    } else {
      acumular("sin_origen", "Sin origen registrado", r);
    }
  }

  const lista = Array.from(filas.values()).sort((a, b) => b.reservas - a.reservas);

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Reportes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Conversión por origen comercial · ingresos atribuibles a pagos
          acreditados
        </p>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2.5">Origen / campaña</th>
                <th className="px-4 py-2.5">Reservas iniciadas</th>
                <th className="px-4 py-2.5">Reservas pagadas</th>
                <th className="px-4 py-2.5">Conversión</th>
                <th className="px-4 py-2.5">Ingresos atribuibles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {lista.map((fila) => (
                <tr key={fila.clave} className="hover:bg-sand-50">
                  <td className="px-4 py-2.5 font-medium text-ink-900">{fila.nombre}</td>
                  <td className="px-4 py-2.5">{fila.reservas}</td>
                  <td className="px-4 py-2.5">{fila.pagadas}</td>
                  <td className="px-4 py-2.5">
                    {fila.reservas > 0
                      ? `${Math.round((fila.pagadas / fila.reservas) * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">{formatPen(fila.ingresos)}</td>
                </tr>
              ))}
              {lista.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink-500" colSpan={5}>
                    Aún no hay reservas para reportar
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          Nota: el conteo de <strong>visitas por campaña</strong> (analytics)
          requiere instrumentación de FASE 8. El origen se registra en cada
          reserva cuando el enlace lo incluye; no se rastrea a usuarios
          individuales dentro de grupos de WhatsApp.
        </p>
      </div>
    </main>
  );
}
