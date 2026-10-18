import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  esProduccion,
  proveedorActivo,
  type EstadoPagoApp,
  type EventoWebhook,
} from "@/lib/payments/gateway";

const CARACTERES = "abcdefghijklmnopqrstuvwxyz0123456789";

function sufijoAleatorio(longitud: number): string {
  let salida = "";
  for (let i = 0; i < longitud; i += 1) {
    salida += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }
  return salida;
}

export type ResultadoPagoIniciado = {
  ok: boolean;
  error?: string;
  referencia?: string;
  urlCheckout?: string | null;
};

/**
 * Crea (o reutiliza) la intención de pago del adelanto de una reserva HELD.
 * El monto SIEMPRE se lee de la base de datos; el navegador no envía importes.
 */
export async function iniciarPagoReserva(token: string): Promise<ResultadoPagoIniciado> {
  if (esProduccion() && proveedorActivo() === "mock") {
    return { ok: false, error: "El simulador de pagos está deshabilitado en producción." };
  }

  const supabase = createSupabaseServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, advance_amount, currency, expires_at")
    .eq("access_token", token)
    .maybeSingle();

  if (!booking) {
    return { ok: false, error: "Reserva no encontrada." };
  }

  const estadosPago = ["HELD", "PENDING_PAYMENT"];
  if (!estadosPago.includes(booking.status)) {
    return { ok: false, error: "La reserva no está en estado de pago." };
  }

  if (!booking.expires_at || new Date(booking.expires_at) <= new Date()) {
    return {
      ok: false,
      error: "La reserva temporal expiró. Crea una reserva nueva.",
    };
  }

  if (Number(booking.advance_amount) <= 0) {
    return { ok: false, error: "Esta cita no requiere adelanto." };
  }

  const { data: pendiente } = await supabase
    .from("payments")
    .select("external_reference")
    .eq("booking_id", booking.id)
    .in("status", ["CREATED", "PENDING"])
    .limit(1)
    .maybeSingle();

  const referencia =
    pendiente?.external_reference ??
    `pago_${booking.id}_${sufijoAleatorio(12)}`;

  if (!pendiente) {
    const { error: errorInsert } = await supabase.from("payments").insert({
      booking_id: booking.id,
      provider: proveedorActivo(),
      external_reference: referencia,
      amount: booking.advance_amount,
      currency: booking.currency,
      status: "PENDING",
    });

    if (errorInsert) {
      return { ok: false, error: "No pudimos iniciar el pago. Intenta de nuevo." };
    }
  }

  return {
    ok: true,
    referencia,
    urlCheckout:
      proveedorActivo() === "mock" ? `/pagos/checkout/${referencia}` : null,
  };
}

export type CuerpoWebhookMock = {
  external_reference: string;
  charge_id: string;
  event_id: string;
  event: EventoWebhook;
  amount: number;
  currency: string;
};

export type ResultadoWebhook = {
  ok: boolean;
  status: number;
  detalle?: string;
};

/** Verifica la firma HMAC-SHA256 del webhook (sobre el cuerpo crudo). */
export function verificarFirmaMock(cuerpo: string, firmaRecibida: string): boolean {
  const secreto = process.env.PAYMENTS_MOCK_WEBHOOK_SECRET?.trim();
  if (!secreto || !firmaRecibida) return false;

  const esperada = createHmac("sha256", secreto).update(cuerpo).digest("hex");
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(firmaRecibida, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

function hashCuerpo(cuerpo: string): string {
  return createHash("sha256").update(cuerpo).digest("hex");
}

/**
 * Procesa un webhook del simulador: autenticidad por firma, match de
 * monto/moneda, idempotencia por event_id y conciliación de pagos tardíos.
 */
export async function procesarWebhookMock(
  cuerpoCrudo: string,
  firma: string,
): Promise<ResultadoWebhook> {
  if (!verificarFirmaMock(cuerpoCrudo, firma)) {
    return { ok: false, status: 401 };
  }

  let cuerpo: CuerpoWebhookMock;
  try {
    cuerpo = JSON.parse(cuerpoCrudo) as CuerpoWebhookMock;
  } catch {
    return { ok: false, status: 400 };
  }

  const supabase = createSupabaseServiceClient();

  const { data: eventoPrevio } = await supabase
    .from("payment_events")
    .select("id")
    .eq("provider", "mock")
    .eq("provider_event_id", cuerpo.event_id)
    .limit(1);

  if (eventoPrevio && eventoPrevio.length > 0) {
    return { ok: true, status: 200, detalle: "evento_duplicado_ignorado" };
  }

  const { data: pago } = await supabase
    .from("payments")
    .select("id, booking_id, amount, currency, status")
    .eq("external_reference", cuerpo.external_reference)
    .maybeSingle();

  if (!pago) {
    return { ok: false, status: 404, detalle: "pago_no_encontrado" };
  }

  if (
    Math.round(Number(cuerpo.amount) * 100) !== Math.round(Number(pago.amount) * 100) ||
    cuerpo.currency !== pago.currency
  ) {
    await supabase
      .from("payments")
      .update({ status: "RECONCILIATION", reconciliation_note: "monto/moneda no coincide" })
      .eq("id", pago.id);
    await supabase.from("payment_reconciliation").insert({
      payment_id: pago.id,
      reason: "mismatch_amount",
      note: `esperado ${pago.amount} ${pago.currency}, recibido ${cuerpo.amount} ${cuerpo.currency}`,
    });
    return { ok: true, status: 200, detalle: "conciliado_mismatch" };
  }

  const estadosFinales = ["SUCCEEDED", "FAILED", "EXPIRED"];
  if (estadosFinales.includes(pago.status)) {
    return { ok: true, status: 200, detalle: "estado_ya_final" };
  }

  const nuevoEstado: EstadoPagoApp =
    cuerpo.event === "charge.succeeded" ? "SUCCEEDED" : "FAILED";

  let booking: { id: string; status: string } | null = null;
  if (pago.booking_id) {
    const { data } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", pago.booking_id)
      .maybeSingle();
    booking = data ?? null;
  }

  if (nuevoEstado === "SUCCEEDED" && booking) {
    const vigente = ["HELD", "PENDING_PAYMENT"].includes(booking.status);
    if (!vigente) {
      await supabase
        .from("payments")
        .update({
          status: "RECONCILIATION",
          occurred_at: new Date().toISOString(),
          reconciliation_note: "pago tardío",
        })
        .eq("id", pago.id);
      await supabase.from("payment_reconciliation").insert({
        payment_id: pago.id,
        reason: "late_after_hold",
        note: `reserva en estado ${booking.status} al acreditar el pago`,
      });
      return { ok: true, status: 200, detalle: "conciliado_tardio" };
    }
  }

  await supabase
    .from("payments")
    .update({
      status: nuevoEstado,
      provider_charge_id: cuerpo.charge_id,
      occurred_at: new Date().toISOString(),
    })
    .eq("id", pago.id);

  if (nuevoEstado === "FAILED" && booking && booking.status === "HELD") {
    await supabase.from("bookings").update({ status: "CANCELLED" }).eq("id", booking.id);
  }

  await supabase.from("payment_events").insert({
    payment_id: pago.id,
    provider: "mock",
    provider_event_id: cuerpo.event_id,
    event_type: cuerpo.event,
    payload_hash: hashCuerpo(cuerpoCrudo),
  });

  return { ok: true, status: 200, detalle: "procesado" };
}

export type PagoVista = {
  referencia: string;
  estado: EstadoPagoApp;
  monto: number;
  moneda: string;
  proveedor: string;
  bookingId: string | null;
  bookingStatus: string | null;
  bookingToken: string | null;
  servicioNombre: string | null;
  inicioLima: string | null;
};

export async function obtenerPago(referencia: string): Promise<PagoVista | null> {
  const supabase = createSupabaseServiceClient();

  const { data: pago } = await supabase
    .from("payments")
    .select(
      "id, external_reference, provider, amount, currency, status, booking_id",
    )
    .eq("external_reference", referencia)
    .maybeSingle();

  if (!pago) return null;

  let booking: {
    status: string;
    access_token: string;
    starts_at: string;
    service: { name: string } | null;
  } | null = null;

  if (pago.booking_id) {
    const { data } = await supabase
      .from("bookings")
      .select("status, access_token, starts_at, service:services(id, name)")
      .eq("id", pago.booking_id)
      .maybeSingle();
    booking = (data ?? null) as
      | { status: string; access_token: string; starts_at: string; service: { name: string } | null }
      | null;
  }

  return {
    referencia: pago.external_reference,
    estado: pago.status,
    monto: Number(pago.amount),
    moneda: pago.currency,
    proveedor: pago.provider,
    bookingId: pago.booking_id,
    bookingStatus: booking?.status ?? null,
    bookingToken: booking?.access_token ?? null,
    servicioNombre: booking?.service?.name ?? null,
    inicioLima: booking?.starts_at ?? null,
  };
}
