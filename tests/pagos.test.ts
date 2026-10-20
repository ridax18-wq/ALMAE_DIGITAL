import { beforeAll, describe, expect, it } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

process.env.NEXT_PUBLIC_ENV = "development";

import {
  iniciarPagoReserva,
  procesarWebhookMock,
  verificarFirmaMock,
  type CuerpoWebhookMock,
} from "@/lib/payments/orquestador";

process.env.PAYMENTS_MOCK_WEBHOOK_SECRET ||= "local-mock-webhook-secret";

const url = "http://127.0.0.1:54321";
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SERVICIO = "terapia-fisica-y-rehabilitacion-consultorio";
const CORRIDA = Date.now();

function idEvento(nombre: string): string {
  return `${nombre}_${CORRIDA}`;
}

function firmar(cuerpo: string): string {
  return createHmac("sha256", process.env.PAYMENTS_MOCK_WEBHOOK_SECRET ?? "")
    .update(cuerpo)
    .digest("hex");
}

function cuerpoWebhook(entrada: {
  referencia: string;
  bookingId: string;
  evento: CuerpoWebhookMock["event"];
  eventId?: string;
  amount?: number;
}): string {
  return JSON.stringify({
    external_reference: entrada.referencia,
    charge_id: `mock_${entrada.bookingId}`,
    event_id: entrada.eventId ?? randomUUID(),
    event: entrada.evento,
    amount: entrada.amount ?? 0,
    currency: "PEN",
  } satisfies CuerpoWebhookMock);
}

type ReservaCreada = { token: string; id: string };

async function crearReserva(): Promise<ReservaCreada> {
  const telefono = `900${String(Date.now()).slice(-6)}`;
  const { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("slug", SERVICIO)
    .maybeSingle();
  if (!service) throw new Error("Servicio no encontrado");

  const { data: variant } = await supabase
    .from("service_variants")
    .select("id")
    .eq("service_id", service.id)
    .limit(1)
    .maybeSingle();
  if (!variant) throw new Error("Variante no encontrada");

  const HORARIOS = ["11:00", "17:30", "12:00", "10:30", "09:00", "18:00", "16:00", "18:30"];

  for (let d = 0; d < 7; d += 1) {
    const f = new Date();
    f.setDate(f.getDate() + d);
    const dow = f.getDay();
    if (dow < 1 || dow > 5) continue;

    const fecha = f.toLocaleDateString("en-CA", { timeZone: "America/Lima" });

    for (const hora of HORARIOS) {
      const { data } = await supabase.rpc("crear_reserva_con_hold", {
        p_service_slug: SERVICIO,
        p_variant_id: variant.id,
        p_starts_at: `${fecha}T${hora}:00-05:00`,
        p_patient: { full_name: "Paciente Pagos Test", phone: telefono, email: "", notes: "", consent: false },
      });

      if (data?.ok) {
        return { token: String(data.token), id: String(data.id) };
      }
    }
  }
  throw new Error("No se pudo crear reserva de prueba");
}

describe("flujo de pagos del simulador", () => {
  beforeAll(async () => {
    const entorno = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!entorno.includes("127.0.0.1")) {
      throw new Error("Estos tests solo corren contra el stack local");
    }
    await supabase
      .from("bookings")
      .delete()
      .in("status", ["HELD", "PENDING_PAYMENT", "CONFIRMED", "EXPIRED"]);
    await supabase.from("patients").delete().neq("phone", "INEXISTENTE");
  });
  it("pago aprobado confirma la cita y los webhooks duplicados no duplican", async () => {
    const reserva = await crearReserva();
    const inicio = await iniciarPagoReserva(reserva.token);
    expect(inicio.ok).toBe(true);

    const pagoDb = (
      await supabase
        .from("payments")
        .select("id, amount, external_reference")
        .eq("booking_id", reserva.id)
        .maybeSingle()
    ).data;
    expect(pagoDb).not.toBeNull();

    const cuerpo = cuerpoWebhook({
      referencia: pagoDb?.external_reference ?? "",
      bookingId: reserva.id,
      evento: "charge.succeeded",
      eventId: idEvento("evt_ok"),      amount: Number(pagoDb?.amount ?? 0),
    });

    const resultado = await procesarWebhookMock(cuerpo, firmar(cuerpo));
    expect(resultado.ok).toBe(true);
    expect(resultado.detalle).toBe("procesado");

    const reservaTras = (
      await supabase.from("bookings").select("status").eq("id", reserva.id).maybeSingle()
    ).data;
    expect(reservaTras?.status).toBe("CONFIRMED");

    const duplicado = await procesarWebhookMock(cuerpo, firmar(cuerpo));
    expect(duplicado.ok).toBe(true);
    expect(duplicado.detalle).toBe("evento_duplicado_ignorado");

    const eventos = (
      await supabase
        .from("payment_events")
        .select("id", { count: "exact" })
        .eq("provider_event_id", idEvento("evt_ok"))
    ).count;
    expect(eventos).toBe(1);
  });

  it("pago rechazado cancela la reserva en hold", async () => {
    const reserva = await crearReserva();
    const inicio = await iniciarPagoReserva(reserva.token);
    expect(inicio.ok).toBe(true);

    const pagoDb = (
      await supabase
        .from("payments")
        .select("id, amount, external_reference")
        .eq("booking_id", reserva.id)
        .maybeSingle()
    ).data;

    const cuerpo = cuerpoWebhook({
      referencia: pagoDb?.external_reference ?? "",
      bookingId: reserva.id,
      evento: "charge.failed",
      eventId: idEvento("evt_fail"),
      amount: Number(pagoDb?.amount ?? 0),
    });

    const resultado = await procesarWebhookMock(cuerpo, firmar(cuerpo));
    expect(resultado.ok).toBe(true);

    const reservaTras = (
      await supabase.from("bookings").select("status").eq("id", reserva.id).maybeSingle()
    ).data;
    expect(reservaTras?.status).toBe("CANCELLED");

    const pagoTras = (
      await supabase.from("payments").select("status").eq("id", pagoDb?.id ?? "").maybeSingle()
    ).data;
    expect(pagoTras?.status).toBe("FAILED");
  });

  it("pago acreditado después de expirar la reserva queda en conciliación", async () => {
    const reserva = await crearReserva();
    const inicio = await iniciarPagoReserva(reserva.token);
    expect(inicio.ok).toBe(true);

    const pagoDb = (
      await supabase
        .from("payments")
        .select("id, amount, external_reference")
        .eq("booking_id", reserva.id)
        .maybeSingle()
    ).data;

    await supabase
      .from("bookings")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", reserva.id);
    await supabase.rpc("expirar_holds");

    const cuerpo = cuerpoWebhook({
      referencia: pagoDb?.external_reference ?? "",
      bookingId: reserva.id,
      evento: "charge.succeeded",
      eventId: idEvento("evt_tardio"),
      amount: Number(pagoDb?.amount ?? 0),
    });

    const resultado = await procesarWebhookMock(cuerpo, firmar(cuerpo));
    expect(resultado.ok).toBe(true);
    expect(resultado.detalle).toBe("conciliado_tardio");

    const reservaTras = (
      await supabase.from("bookings").select("status").eq("id", reserva.id).maybeSingle()
    ).data;
    expect(reservaTras?.status).toBe("EXPIRED");

    const conciliacion = (
      await supabase
        .from("payment_reconciliation")
        .select("reason")
        .eq("payment_id", pagoDb?.id ?? "")
        .maybeSingle()
    ).data;
    expect(conciliacion?.reason).toBe("late_after_hold");
  });

  it("monto disímil se envía a conciliación y no confirma", async () => {
    const reserva = await crearReserva();
    const inicio = await iniciarPagoReserva(reserva.token);
    expect(inicio.ok).toBe(true);

    const pagoDb = (
      await supabase
        .from("payments")
        .select("id, external_reference")
        .eq("booking_id", reserva.id)
        .maybeSingle()
    ).data;

    const cuerpo = cuerpoWebhook({
      referencia: pagoDb?.external_reference ?? "",
      bookingId: reserva.id,
      evento: "charge.succeeded",
      eventId: idEvento("evt_mismatch"),
      amount: 999.99,
    });

    const resultado = await procesarWebhookMock(cuerpo, firmar(cuerpo));
    expect(resultado.ok).toBe(true);
    expect(resultado.detalle).toBe("conciliado_mismatch");

    const reservaTras = (
      await supabase.from("bookings").select("status").eq("id", reserva.id).maybeSingle()
    ).data;
    expect(reservaTras?.status).toBe("HELD");

    const pagoTras = (
      await supabase.from("payments").select("status").eq("id", pagoDb?.id ?? "").maybeSingle()
    ).data;
    expect(pagoTras?.status).toBe("RECONCILIATION");
  });

  it("firma inválida es rechazada", () => {
    const cuerpo = JSON.stringify({ external_reference: "x" });
    expect(verificarFirmaMock(cuerpo, "firma_falsa")).toBe(false);
    expect(verificarFirmaMock(cuerpo, "")).toBe(false);
  });

  it("la reserva temporal vigente permite iniciar pago y la expirada no", async () => {
    const reserva = await crearReserva();

    const expirada = await iniciarPagoReserva("a".repeat(64));
    expect(expirada.ok).toBe(false);

    await supabase
      .from("bookings")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", reserva.id);

    const resultado = await iniciarPagoReserva(reserva.token);
    expect(resultado.ok).toBe(false);
    expect(String(resultado.error)).toContain("expiró");
  });
});
