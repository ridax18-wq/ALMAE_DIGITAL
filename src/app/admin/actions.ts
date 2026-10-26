"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mensajeDeErrorAuth } from "@/lib/supabase/errores-auth";

const credencialesSchema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type EstadoLogin = { error: string | null };

export async function iniciarSesion(
  _estadoAnterior: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const parsed = credencialesSchema.safeParse({
    email: datos.get("email"),
    password: datos.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  if (
    parsed.data.email.toLowerCase() === "admin@almae.demo" &&
    (process.env.NEXT_PUBLIC_ENV === "production" ||
      process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"))
  ) {
    return { error: "Cuenta de demostración no disponible en producción." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const mensaje = String(error.message).toLowerCase();
    const clave = mensaje.includes("invalid")
      ? "invalid_credentials"
      : mensaje.includes("not confirmed")
        ? "email_not_confirmed"
        : null;
    return { error: mensajeDeErrorAuth(clave) };
  }

  redirect("/admin");
}

export async function solicitarRecuperacion(
  _estadoAnterior: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const email = String(datos.get("email") ?? "");
  const parsed = z.email("Ingresa un correo válido").safeParse(email);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createSupabaseServerClient();
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocolo = host.includes("localhost") ? "http" : "https";

  const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${protocolo}://${host}/admin/recuperar`,
  });

  if (errorEnvio) {
    const limitado = String(errorEnvio.message ?? "").toLowerCase().includes("rate");
    return { error: mensajeDeErrorAuth(limitado ? "over_email_send_rate_limit" : "unexpected_failure") };
  }

  return { error: null };
}

export async function actualizarContraseña(
  _estadoAnterior: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const password = String(datos.get("password") ?? "");
  const parsed = z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .safeParse(password);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const debil = String(error.message ?? "").toLowerCase().includes("weak");
    return { error: mensajeDeErrorAuth(debil ? "weak_password" : "unexpected_failure") };
  }

  await supabase.auth.signOut();
  redirect("/admin/login?actualizada=1");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
