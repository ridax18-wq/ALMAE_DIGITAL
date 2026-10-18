"use server";

import { redirect } from "next/navigation";
import { cancelarReserva } from "@/lib/services/reservas";
import { iniciarPagoReserva } from "@/lib/payments/orquestador";

export async function cancelarMiReserva(datos: FormData): Promise<void> {
  const token = String(datos.get("token") ?? "");
  if (!token) redirect("/");

  const resultado = await cancelarReserva(token);

  if (!resultado.ok) {
    redirect(`/reserva/${token}?error=politica`);
  }

  redirect(`/reserva/${token}`);
}

export async function pagarAdelanto(datos: FormData): Promise<void> {
  const token = String(datos.get("token") ?? "");
  if (!token) redirect("/");

  const resultado = await iniciarPagoReserva(token);

  if (!resultado.ok || !resultado.urlCheckout) {
    redirect(
      `/reserva/${token}?error=${encodeURIComponent(resultado.error ?? "No se pudo iniciar el pago")}`,
    );
  }

  redirect(resultado.urlCheckout);
}
