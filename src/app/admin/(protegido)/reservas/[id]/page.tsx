import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  crearAdelantoManual,
  verificarAdelantoManual,
  rechazarAdelantoManual,
  extenderRetencionManual,
  aprobarConfirmacion,
  marcarCompletada,
  marcarNoShow,
  cancelarAdmin,
  reprogramarAdmin,
} from "@/app/admin/(protegido)/reservas/actions";
import { ClockIcon, WalletIcon } from "@/components/icons";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { listarAdelantos } from "@/lib/services/admin-reservas";
import { ETIQUETAS_ESTADO } from "@/lib/services/estados";
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
  searchParams: Promise<{ error?: string; confirmada?: string }>;
}) {
  const { id } = await params;
  const { error: errorUrl, confirmada } = await searchParams;

  const supabase = createSupabaseServiceClient();

  const { data: reserva } = await supabase
    .from("bookings")
    .select(
      "id, status, origin, starts_at, ends_at, amount_cents, deposit_required_cents, deposit_verified_cents, currency, public_code, notes, utm_source, utm_medium, utm_campaign, hold_expires_at, created_at, patient_id, service_id, service_variant_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!reserva) notFound();

  const [{ data: paciente }, { data: servicio }, { data: variante }] =
    await Promise.all([
      supabase.from("patients").select("id, full_name, phone, email").eq("id", reserva.patient_id).maybeSingle(),
      supabase.from("services").select("id, name, slug").eq("id", reserva.service_id).maybeSingle(),
      supabase.from("service_variants").select("id, duration_minutes, price").eq("id", reserva.service_variant_id).maybeSingle(),
    ]);

  const { data: eventosReserva } = await supabase
    .from("booking_events")
    .select("from_status, to_status, actor, reason, created_at")
    .eq("booking_id", id)
    .order("created_at");

  const adelantos = await listarAdelantos(id);

  const estado = ETIQUETAS_ESTADO[reserva.status] ?? {
    texto: reserva.status,
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  };
  const verificadoSuma = adelantos
    .filter((a) => a.verificationStatus === "VERIFIED")
    .reduce((t, a) => t + a.amountCents, 0);
  const saldo = reserva.amount_cents - reserva.deposit_required_cents;
  const puedeConfirmar =
    reserva.status === "HELD" && verificadoSuma >= reserva.deposit_required_cents;
  const retencionVigente =
    reserva.hold_expires_at && new Date(reserva.hold_expires_at) > new Date();

  const origenEtiqueta =
    reserva.origin === "IN_PERSON" ? "Presencial" : reserva.origin === "ADMIN" ? "Panel" : "Web";

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/reservas" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a reservas
        </Link>

        {confirmada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Cita confirmada correctamente.
          </p>
        ) : null}

        {errorUrl ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorUrl)}
          </p>
        ) : null}

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${estado.clases}`}>
                {estado.texto}
              </span>
              <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-ink-700">
                {origenEtiqueta}
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">
              {servicio?.name}
            </h1>
            <p className="mt-1 font-mono text-sm text-ink-500">
              Código: {reserva.public_code} · creada el{" "}
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
                <dt className="text-ink-700">Precio total</dt>
                <dd className="font-semibold text-ink-900">{formatPen(reserva.amount_cents)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Adelanto requerido</dt>
                <dd className="font-semibold text-ink-900">
                  {formatPen(reserva.deposit_required_cents)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Adelanto verificado</dt>
                <dd className={`font-semibold ${puedeConfirmar || reserva.status !== "HELD" ? "text-green-900" : "text-red-800"}`}>
                  {formatPen(verificadoSuma)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Saldo en consultorio</dt>
                <dd className="font-semibold text-ink-900">{formatPen(saldo)}</dd>
              </div>
              {reserva.status === "HELD" ? (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-ink-700">Retención vence</dt>
                  <dd className={`font-semibold ${retencionVigente ? "text-ink-900" : "text-red-800"}`}>
                    {reserva.hold_expires_at
                      ? String(reserva.hold_expires_at).slice(11, 16) + " (vigencia del servidor)"
                      : "—"}
                  </dd>
                </div>
              ) : null}
              {reserva.utm_source || reserva.utm_campaign ? (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-ink-700">Origen (UTM)</dt>
                  <dd className="text-right text-xs text-ink-700">
                    {[reserva.utm_source, reserva.utm_medium, reserva.utm_campaign].filter(Boolean).join(" / ") || "—"}
                  </dd>
                </div>
              ) : null}
            </dl>

            <h2 className="mt-8 font-display text-lg font-bold text-ink-900">
              Adelantos registrados
            </h2>
            <ul className="mt-3 divide-y divide-sand-200 rounded-xl border border-sand-200">
              {adelantos.map((adelanto) => (
                <li key={adelanto.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold text-ink-900">
                      {formatPen(adelanto.amountCents)} · {adelanto.method}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {adelanto.transactionReference || "sin referencia"} ·{" "}
                      {adelanto.paidAt ? String(adelanto.paidAt).slice(0, 10) : "—"} ·{" "}
                      {adelanto.verificationStatus}
                      {adelanto.rejectionReason ? ` (${adelanto.rejectionReason})` : ""}
                    </span>
                  </span>
                  {adelanto.verificationStatus === "REPORTED" && reserva.status === "HELD" ? (
                    <span className="flex gap-2">
                      <form action={verificarAdelantoManual}>
                        <input type="hidden" name="booking_id" value={reserva.id} />
                        <input type="hidden" name="payment_id" value={adelanto.id} />
                        <button type="submit" className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">
                          Verificar
                        </button>
                      </form>
                      <form action={rechazarAdelantoManual} className="flex gap-1">
                        <input type="hidden" name="booking_id" value={reserva.id} />
                        <input type="hidden" name="payment_id" value={adelanto.id} />
                        <input
                          name="motivo"
                          placeholder="motivo"
                          className="w-24 rounded-lg border border-sand-200 px-2 py-1.5 text-xs"
                        />
                        <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50">
                          Rechazar
                        </button>
                      </form>
                    </span>
                  ) : null}
                </li>
              ))}
              {adelantos.length === 0 ? (
                <li className="px-4 py-4 text-sm text-ink-500">Sin adelantos registrados</li>
              ) : null}
            </ul>

            <h2 className="mt-8 font-display text-lg font-bold text-ink-900">
              Historial
            </h2>
            <ol className="mt-3 space-y-2 text-xs text-ink-700">
              {(eventosReserva ?? []).map((evento) => (
                <li key={`${evento.created_at}-${evento.to_status}-${evento.reason}`}>
                  <span className="font-semibold text-ink-900">
                    {evento.from_status ? `${evento.from_status} →` : "creación →"} {evento.to_status}
                  </span>{" "}
                  ({evento.actor}) · {String(evento.created_at).slice(0, 19).replace("T", " ")}
                  {evento.reason ? ` — ${evento.reason}` : ""}
                </li>
              ))}
            </ol>
          </div>

          <aside className="h-fit space-y-5">
            {reserva.status === "HELD" ? (
              <>
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
                  <h2 className="font-display text-base font-bold text-ink-900">
                    Confirmar cita
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-700">
                    Requiere: retención vigente + adelanto verificado suficiente.
                  </p>
                  <form action={aprobarConfirmacion} className="mt-3">
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <input name="motivo" placeholder="Motivo (opcional)" className="mb-2 w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs" />
                    <button
                      type="submit"
                      disabled={!puedeConfirmar}
                      className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {puedeConfirmar ? "Confirmar cita" : "Falta adelanto verificado"}
                    </button>
                  </form>
                  <form action={extenderRetencionManual} className="mt-4 border-t border-sand-200 pt-3">
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <p className="mb-2 text-xs font-semibold text-ink-700">
                      Extender retención (máx. 30 min por operación)
                    </p>
                    <div className="flex gap-2">
                      <input name="minutos" type="number" min="5" max="30" defaultValue="15" className="w-20 rounded-lg border border-sand-200 bg-white px-2 py-2 text-xs" aria-label="Minutos" />
                      <input name="motivo" placeholder="Motivo" className="flex-1 rounded-lg border border-sand-200 bg-white px-2 py-2 text-xs" />
                      <button type="submit" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-semibold text-ink-900 hover:bg-sand-100">
                        Extender
                      </button>
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                  <h2 className="inline-flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <WalletIcon className="size-4 text-brand-600" />
                    Registrar adelanto manual
                  </h2>
                  <form action={crearAdelantoManual} className="mt-3 flex flex-col gap-2.5">
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <select name="method" aria-label="Método" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm">
                      <option value="YAPE">Yape</option>
                      <option value="PLIN">Plin</option>
                      <option value="BANK_TRANSFER">Transferencia</option>
                      <option value="CASH">Efectivo</option>
                      <option value="OTHER">Otro</option>
                    </select>
                    <input name="monto" type="number" step="0.10" min="0.10" required placeholder={`Adelanto (S/)`} defaultValue={(reserva.deposit_required_cents / 100).toFixed(2)} className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                    <input name="referencia" maxLength={60} placeholder="Referencia / N° de operación" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                    <label className="text-xs text-ink-700" htmlFor="paid_at">Fecha declarada del pago</label>
                    <input id="paid_at" name="paid_at" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                    <input name="notes" maxLength={200} placeholder="Observación interna (opcional)" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                    <button type="submit" className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                      Registrar (queda REPORTED)
                    </button>
                  </form>
                </div>

                <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                  <h2 className="font-display text-base font-bold text-ink-900">Reprogramar</h2>
                  <form action={reprogramarAdmin} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <input name="fecha_nueva" type="date" required aria-label="Nueva fecha" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                    <input name="hora_nueva" type="time" required aria-label="Nueva hora" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
                    <button type="submit" className="rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100">
                      Reprogramar
                    </button>
                  </form>
                </div>
              </>
            ) : null}

            {reserva.status === "CONFIRMED" ? (
              <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                <h2 className="font-display text-base font-bold text-ink-900">
                  Gestión de cita confirmada
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  <form action={marcarCompletada}>
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <button type="submit" className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                      Marcar completada
                    </button>
                  </form>
                  <form action={marcarNoShow}>
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <button type="submit" className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50">
                      Registrar inasistencia
                    </button>
                  </form>
                  <form action={cancelarAdmin} className="flex gap-2">
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <input name="motivo" placeholder="Motivo" className="flex-1 rounded-lg border border-sand-200 px-2 py-2 text-xs" />
                    <button type="submit" className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-50">
                      Cancelar
                    </button>
                  </form>
                  <form action={reprogramarAdmin} className="border-t border-sand-200 pt-3">
                    <input type="hidden" name="booking_id" value={reserva.id} />
                    <p className="mb-2 text-xs font-semibold text-ink-700">Reprogramar cita</p>
                    <div className="flex gap-2">
                      <input name="fecha_nueva" type="date" required className="rounded-lg border border-sand-200 bg-white px-2 py-2 text-xs" />
                      <input name="hora_nueva" type="time" required className="w-24 rounded-lg border border-sand-200 bg-white px-2 py-2 text-xs" />
                      <button type="submit" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-semibold text-ink-900 hover:bg-sand-100">
                        Mover
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
