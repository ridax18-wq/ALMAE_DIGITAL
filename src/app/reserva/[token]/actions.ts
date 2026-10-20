"use server";

import { redirect } from "next/navigation";
import { cancelarReserva } from "@/lib/services/reservas";

export async function cancelarMiReserva(datos: FormData): Promise<void> {
  const token = String(datos.get("token") ?? "");
  if (!token) redirect("/");

  const resultado = await cancelarReserva(token);

  if (!resultado.ok) {
    redirect(`/reserva/${token}?error=politica`);
  }

  redirect(`/reserva/${token}`);
}
