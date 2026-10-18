"use server";

import { headers } from "next/headers";
import { createHmac, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obtenerPago } from "@/lib/payments/orquestador";
import { esProduccion } from "@/lib/payments/gateway";

async function enviarWebhookSimulado(
  referencia: string,
  evento: "charge.succeeded" | "charge.failed",
): Promise<string | null> {
  const pago = await obtenerPago(referencia);
  if (!pago || !pago.bookingId) return "No encontramos el pago indicado.";

  const cuerpo = JSON.stringify({
    external_reference: referencia,
    charge_id: `mock_${pago.bookingId}`,
    event_id: randomUUID(),
    event: evento,
    amount: pago.monto,
    currency: pago.moneda,
  });

  const secreto = process.env.PAYMENTS_MOCK_WEBHOOK_SECRET?.trim();
  if (!secreto) return "Falta PAYMENTS_MOCK_WEBHOOK_SECRET en el entorno.";

  const firma = createHmac("sha256", secreto).update(cuerpo).digest("hex");

  const host = (await headers()).get("host") ?? "localhost:3000";
  const respuesta = await fetch(`http://${host}/api/webhooks/pagos/mock`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": firma },
    body: cuerpo,
  });

  if (!respuesta.ok) {
    return `El webhook devolvió ${respuesta.status}.`;
  }

  return null;
}

export async function aprobarPago(datos: FormData): Promise<void> {
  if (esProduccion()) redirect("/");
  const referencia = String(datos.get("referencia") ?? "");
  const errorWebhook = await enviarWebhookSimulado(referencia, "charge.succeeded");
  if (errorWebhook) {
    redirect(`/pagos/checkout/${referencia}?error=${encodeURIComponent(errorWebhook)}`);
  }
  revalidatePath(`/pagos/resultado/${referencia}`);
  redirect(`/pagos/resultado/${referencia}`);
}

export async function rechazarPago(datos: FormData): Promise<void> {
  if (esProduccion()) redirect("/");
  const referencia = String(datos.get("referencia") ?? "");
  await enviarWebhookSimulado(referencia, "charge.failed");
  revalidatePath(`/pagos/resultado/${referencia}`);
  redirect(`/pagos/resultado/${referencia}`);
}

export async function reenviarWebhookDuplicado(datos: FormData): Promise<void> {
  if (esProduccion()) redirect("/");
  const referencia = String(datos.get("referencia") ?? "");
  const pago = await obtenerPago(referencia);
  if (!pago || !pago.bookingId) {
    redirect(`/pagos/checkout/${referencia}?error=pago no encontrado`);
  }

  const cuerpo = JSON.stringify({
    external_reference: referencia,
    charge_id: `mock_${pago.bookingId}`,
    event_id: `dup_${pago.bookingId}`,
    event: "charge.succeeded",
    amount: pago.monto,
    currency: pago.moneda,
  });

  const secreto = process.env.PAYMENTS_MOCK_WEBHOOK_SECRET?.trim();
  if (!secreto) redirect(`/pagos/checkout/${referencia}?error=falta secreto`);

  const firma = createHmac("sha256", secreto).update(cuerpo).digest("hex");
  const host = (await headers()).get("host") ?? "localhost:3000";

  await fetch(`http://${host}/api/webhooks/pagos/mock`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": firma },
    body: cuerpo,
  });
  await fetch(`http://${host}/api/webhooks/pagos/mock`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": firma },
    body: cuerpo,
  });

  revalidatePath(`/pagos/resultado/${referencia}`);
  redirect(`/pagos/resultado/${referencia}`);
}
