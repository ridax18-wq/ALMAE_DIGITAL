"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verificarAdelanto, rechazarAdelanto } from "@/lib/services/admin-reservas";

export async function verificarPagoPage(datos: FormData): Promise<void> {
  const paymentId = z.uuid().safeParse(datos.get("payment_id"));
  const bookingId = String(datos.get("booking_id") ?? "");

  if (!paymentId.success) {
    redirect("/admin/pagos?error=datos_invalidos");
  }

  const resultado = await verificarAdelanto(paymentId.data);

  if (!resultado.ok) {
    redirect(`/admin/pagos?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath("/admin/pagos");
  revalidatePath(`/admin/reservas/${bookingId}`);
  redirect("/admin/pagos");
}

export async function rechazarPagoPage(datos: FormData): Promise<void> {
  const paymentId = z.uuid().safeParse(datos.get("payment_id"));
  const motivo = String(datos.get("motivo") ?? "");

  if (!paymentId.success) {
    redirect("/admin/pagos?error=datos_invalidos");
  }

  const resultado = await rechazarAdelanto(paymentId.data, motivo);

  if (!resultado.ok) {
    redirect(`/admin/pagos?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath("/admin/pagos");
  redirect("/admin/pagos");
}
