import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cambiarEstadoReserva, registrarPagoManual } from "@/app/admin/(protegido)/reservas/actions";
import { ClockIcon, WalletIcon } from "@/components/icons";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ETIQUETAS_ESTADO, TRANSICIONES_ADMIN } from "@/lib/services/estados";
import { formatFechaLima, formatHorarioLima, formatPen } from "@/lib/format";

export const metadata: Metadata = {
  title: "Detalle de reserva",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReservaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorUrl } = await searchParams;

  const supabase = createSupabaseServiceClient();

  const { data: reserva } = await supabase
    .from("bookings")
    .select(
      "id, status, starts_at, ends_at, total_amount, advance_amount, currency, notes, utm_source, utm_medium, utm_campaign, created_at, patient_id, service_id, service_variant_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!reserva) notFound();

  const [{ data: paciente }, { data: servicio }, { data: variante }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name, phone, email")
        .eq("id", reserva.patient_id)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id, name, slug")
        .eq("id", reserva.service_id)
        .maybeSingle(),
      supabase
        .from("service_variants")
        .select("id, duration_minutes, price")
        .eq("id", reserva.service_variant_id)
        .maybeSingle(),
    ]);

  const [{ data: pagosReserva }, { data: eventosReserva }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, provider, amount, currency, status, method, occurred_at")
      .eq("booking_id", id)
      .order("created_at"),
    supabase
      .from("booking_events")
      .select("from_status, to_status, actor, reason, created_at")
      .eq("booking_id", id)
      .order("created_at"),
  ]);

  const estado = ETIQUETAS_ESTADO[reserva.status] ?? {
    texto: reserva.status,
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  };
  const transiciones = TRANSICIONES_ADMIN[reserva.status] ?? [];
  const saldo = Number(reserva.total_amount) - Number(reserva.advance_amount);
  const pagado = (pagosReserva ?? [])
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((t, p) => t + Number(p.amount), 0);

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/reservas" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a reservas
        </Link>

        {errorUrl ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No se pudo aplicar la operación ({errorUrl}).
          </p>
        ) : null}

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${estado.clases}`}>
              {estado.texto}
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">
              {servicio?.name}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Reserva {reserva.id.slice(0, 8)} · creada el{" "}
              {String(reserva.created_at).slice(0, 16).replace("T", " ")}
            </p>

            <dl className="mt-6 divide-y divide-sand-200 text-sm">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Paciente</dt>
                <dd className="text-right font-semibold text-ink-900">
                  {paciente?.full_name}
                  <span className="block text-xs font-normal text-ink-500">
                    {paciente?.phone}
                    {paciente?.email ? ` · ${paciente.email}` : ""}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="inline-flex items-center gap-1.5 text-ink-700">
                  <ClockIcon className="size-4 text-brand-600" />
                  Fecha y hora
                </dt>
                <dd className="text-right font-semibold text-ink-900">
                  {formatFechaLima(String(reserva.starts_at))}
                  <span className="block text-xs font-normal text-ink-500">
                    {formatHorarioLima(String(reserva.starts_at), String(reserva.ends_at))} (
                    {variante?.duration_minutes} min)
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Precio / adelanto / saldo</dt>
                <dd className="text-right font-semibold text-ink-900">
                  {formatPen(reserva.total_amount)} / {formatPen(reserva.advance_amount)} /{" "}
                  {formatPen(saldo)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Pagos acreditados</dt>
                <dd className="text-right font-semibold text-brand-700">{formatPen(pagado)}</dd>
              </div>
              {reserva.utm_source || reserva.utm_campaign ? (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-ink-700">Origen (UTM)</dt>
                  <dd className="text-right text-xs text-ink-700">
                    {[reserva.utm_source, reserva.utm_medium, reserva.utm_campaign]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </dd>
                </div>
              ) : null}
              {reserva.notes ? (
                <div className="py-2.5">
                  <dt className="text-ink-700">Comentarios del paciente</dt>
                  <dd className="mt-1 rounded-xl bg-sand-100 p-3 text-xs text-ink-700">
                    {reserva.notes}
                  </dd>
                </div>
              ) : null}
            </dl>

            <h2 className="mt-8 font-display text-lg font-bold text-ink-900">
              Pagos registrados
            </h2>
            {pagosReserva && pagosReserva.length > 0 ? (
              <ul className="mt-3 divide-y divide-sand-200 rounded-xl border border-sand-200">
                {pagosReserva.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="font-medium text-ink-900">
                      {formatPen(p.amount)} · {p.provider} · {p.method || "—"}
                    </span>
                    <span className="text-xs text-ink-500">
                      {p.status} · {String(p.occurred_at ?? "").slice(0, 16).replace("T", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-500">Sin pagos registrados</p>
            )}

            <h2 className="mt-8 font-display text-lg font-bold text-ink-900">
              Historial de estados
            </h2>
            <ol className="mt-3 space-y-2">
              {(eventosReserva ?? []).map((evento) => (
                <li key={`${evento.created_at}-${evento.to_status}`} className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
                  <span className="font-semibold text-ink-900">
                    {evento.from_status ? `${evento.from_status} →` : "creación →"} {evento.to_status}
                  </span>
                  <span>
                    ({evento.actor}) · {String(evento.created_at).slice(0, 19).replace("T", " ")}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="h-fit space-y-6">
            <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
              <h2 className="font-display text-lg font-bold text-ink-900">Cambiar estado</h2>
              {transiciones.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {transiciones.map((t) => (
                    <form key={t.a} action={cambiarEstadoReserva}>
                      <input type="hidden" name="booking_id" value={reserva.id} />
                      <input type="hidden" name="nuevo_estado" value={t.a} />
                      <button
                        type="submit"
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                          t.tono === "primary"
                            ? "bg-brand-700 text-white hover:bg-brand-800"
                            : t.tono === "danger"
                              ? "border border-red-200 text-red-800 hover:bg-red-50"
                              : "border border-sand-200 text-ink-900 hover:bg-sand-100"
                        }`}
                      >
                        {t.texto}
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-500">
                  No hay cambios de estado permitidos para esta reserva.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                <WalletIcon className="size-5 text-brand-600" />
                Registrar pago manual
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                Para efectivo, Yape, Plin o transferencia. Si la reserva está
                pendiente, se confirma automáticamente.
              </p>
              <form action={registrarPagoManual} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="booking_id" value={reserva.id} />
                <div>
                  <label htmlFor="monto" className="mb-1 block text-sm font-semibold text-ink-900">
                    Monto (PEN)
                  </label>
                  <input
                    id="monto"
                    name="monto"
                    type="number"
                    step="0.10"
                    min="0.1"
                    required
                    defaultValue={saldo > 0 ? saldo : ""}
                    className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="metodo" className="mb-1 block text-sm font-semibold text-ink-900">
                    Método
                  </label>
                  <select id="metodo" name="metodo" className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm">
                    <option value="efectivo">Efectivo</option>
                    <option value="yape">Yape</option>
                    <option value="plin">Plin</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <button type="submit" className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                  Registrar pago
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
