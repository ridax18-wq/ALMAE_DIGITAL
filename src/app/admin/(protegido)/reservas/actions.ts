"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  registrarAdelantoManual,
  verificarAdelanto,
  rechazarAdelanto,
  confirmarReservaAdmin,
  extenderRetencion,
  completarCita,
  registrarNoShow,
  cancelarComoAdmin,
  reprogramarReserva,
  type MetodoAdelanto,
} from "@/lib/services/admin-reservas";

const uuidSchema = z.uuid();

function validarO<T>(
  redirectUrl: string,
  resultado: { success: boolean; error?: { issues: { message?: string }[] }; data?: T },
): T {
  if (!resultado.success) {
    redirect(`${redirectUrl}?error=${encodeURIComponent(resultado.error?.issues?.[0]?.message ?? "datos inválidos")}`);
  }
  return resultado.data as T;
}

export async function crearAdelantoManual(datos: FormData): Promise<void> {
  const bookingId = String(datos.get("booking_id") ?? "");
  const parsed = validarO(`/admin/reservas/${bookingId}`,
    z
      .object({
        method: z.enum(["YAPE", "PLIN", "BANK_TRANSFER", "CASH", "OTHER"]),
        amount_cents: z.coerce.number().int().positive("El monto debe ser mayor a 0"),
        transaction_reference: z.string().trim().max(60).optional(),
        paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de pago inválida"),
        notes: z.string().max(200).optional(),
      })
      .safeParse({
        method: datos.get("method"),
        amount_cents: Math.round(Number(datos.get("monto") ?? 0) * 100),
        transaction_reference: datos.get("referencia"),
        paid_at: datos.get("paid_at"),
        notes: datos.get("notes"),
      }),
  );

  const resultado = await registrarAdelantoManual({
    bookingId,
    method: parsed.method as MetodoAdelanto,
    amountCents: parsed.amount_cents as number,
    transactionReference: (parsed.transaction_reference as string) ?? "",
    paidAt: `${parsed.paid_at as string}T12:00:00-05:00`,
    notes: (parsed.notes as string) ?? "",
  });

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId}`);
  redirect(`/admin/reservas/${bookingId}`);
}

export async function verificarAdelantoManual(datos: FormData): Promise<void> {
  const bookingId = String(datos.get("booking_id") ?? "");
  const paymentId = uuidSchema.safeParse(datos.get("payment_id"));

  if (!paymentId.success) {
    redirect(`/admin/reservas/${bookingId}?error=datos_invalidos`);
  }

  const resultado = await verificarAdelanto(paymentId.data);

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId}`);
  redirect(`/admin/reservas/${bookingId}`);
}

export async function rechazarAdelantoManual(datos: FormData): Promise<void> {
  const bookingId = String(datos.get("booking_id") ?? "");
  const paymentId = uuidSchema.safeParse(datos.get("payment_id"));
  const motivo = String(datos.get("motivo") ?? "");

  if (!paymentId.success) {
    redirect(`/admin/reservas/${bookingId}?error=datos_invalidos`);
  }

  const resultado = await rechazarAdelanto(paymentId.data, motivo);

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId}`);
  redirect(`/admin/reservas/${bookingId}`);
}

export async function aprobarConfirmacion(datos: FormData): Promise<void> {
  const bookingId = uuidSchema.safeParse(datos.get("booking_id"));
  const retornoBruto = String(datos.get("retorno") ?? "");
  const retorno = retornoBruto === "/admin/reservas" ? retornoBruto : null;
  if (!bookingId.success) redirect("/admin/reservas?error=datos_invalidos");

  const motivo = String(datos.get("motivo") ?? "");
  const resultado = await confirmarReservaAdmin(bookingId.data, motivo);

  if (!resultado.ok) {
    const destino = retorno ?? `/admin/reservas/${bookingId.data}`;
    redirect(`${destino}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId.data}`);
  revalidatePath("/admin/reservas");
  revalidatePath("/reserva");
  if (retorno) redirect(`${retorno}?confirmada=1`);
  redirect(`/admin/reservas/${bookingId.data}?confirmada=1`);
}

export async function extenderRetencionManual(datos: FormData): Promise<void> {
  const bookingId = String(datos.get("booking_id") ?? "");
  const parsed = validarO(`/admin/reservas/${bookingId}`,
    z
      .object({
        minutos: z.coerce.number().int().positive("Minutos inválidos"),
        motivo: z.string().max(120).optional(),
      })
      .safeParse({
        minutos: datos.get("minutos"),
        motivo: datos.get("motivo"),
      }),
  );

  const resultado = await extenderRetencion(bookingId, parsed.minutos as number, (parsed.motivo as string) ?? "");

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId}`);
  redirect(`/admin/reservas/${bookingId}`);
}

export async function marcarCompletada(datos: FormData): Promise<void> {
  const bookingId = uuidSchema.safeParse(datos.get("booking_id"));
  if (!bookingId.success) redirect("/admin/reservas?error=datos_invalidos");

  const resultado = await completarCita(bookingId.data);

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId.data}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId.data}`);
  redirect(`/admin/reservas/${bookingId.data}`);
}

export async function marcarNoShow(datos: FormData): Promise<void> {
  const bookingId = uuidSchema.safeParse(datos.get("booking_id"));
  if (!bookingId.success) redirect("/admin/reservas?error=datos_invalidos");

  const resultado = await registrarNoShow(bookingId.data);

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId.data}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId.data}`);
  redirect(`/admin/reservas/${bookingId.data}`);
}

export async function cancelarAdmin(datos: FormData): Promise<void> {
  const bookingId = uuidSchema.safeParse(datos.get("booking_id"));
  if (!bookingId.success) redirect("/admin/reservas?error=datos_invalidos");

  const motivo = String(datos.get("motivo") ?? "");
  const resultado = await cancelarComoAdmin(bookingId.data, motivo);

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId.data}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId.data}`);
  redirect(`/admin/reservas/${bookingId.data}`);
}

export async function reprogramarAdmin(datos: FormData): Promise<void> {
  const bookingId = String(datos.get("booking_id") ?? "");
  const parsed = validarO(`/admin/reservas/${bookingId}`,
    z
      .object({
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
        hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
      })
      .safeParse({
        fecha: datos.get("fecha_nueva"),
        hora: datos.get("hora_nueva"),
      }),
  );

  const nuevoInicio = `${parsed.fecha as string}T${parsed.hora as string}:00-05:00`;
  const resultado = await reprogramarReserva(bookingId, nuevoInicio);

  if (!resultado.ok) {
    redirect(`/admin/reservas/${bookingId}?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath(`/admin/reservas/${bookingId}`);
  redirect(`/admin/reservas/${bookingId}`);
}
