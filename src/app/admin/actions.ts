"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Credenciales incorrectas. Verifica e intenta de nuevo." };
  }

  redirect("/admin");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
