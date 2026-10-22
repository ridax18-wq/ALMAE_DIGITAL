"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  MAPA_BLOQUES,
  esquemas,
  validarCuerpo,
  type ClaveBloque,
} from "@/lib/cms/bloques";

function destinoError(bloque: string, error: string): never {
  redirect(`/admin/contenidos/${bloque}?error=${encodeURIComponent(error)}`);
}

async function validarSesionYClave(datos: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const clave = String(datos.get("bloque") ?? "");
  const def = MAPA_BLOQUES.get(clave);
  if (!def) redirect("/admin/contenidos?error=bloque_invalido");

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(String(datos.get("body") ?? "{}"));
  } catch {
    destinoError(clave, "json_invalido");
  }

  try {
    validarCuerpo(clave as ClaveBloque, cuerpo);
  } catch {
    destinoError(clave, "validacion_fallida");
  }
  return { supabase, clave, cuerpo, userId: user.id };
}

export async function guardarBorradorContenido(datos: FormData): Promise<void> {
  const { supabase, clave, cuerpo, userId } = await validarSesionYClave(datos);
  const esquema = esquemas[clave as ClaveBloque];

  const parseo = esquema.safeParse(cuerpo);
  if (!parseo.success) destinoError(clave, "validacion_fallida");

  const { error } = await supabase
    .from("content_blocks")
    .upsert(
      {
        block_key: clave,
        body: parseo.data,
        status: "draft",
        updated_by: userId,
      },
      { onConflict: "block_key" },
    );

  if (error) destinoError(clave, "no_guardado");
  redirect(`/admin/contenidos/${clave}?borrador=1`);
}

export async function publicarContenidoBloque(datos: FormData): Promise<void> {
  const { clave, cuerpo, userId } = await validarSesionYClave(datos);
  const esquema = esquemas[clave as ClaveBloque];

  const parseo = esquema.safeParse(cuerpo);
  if (!parseo.success) destinoError(clave, "validacion_fallida");

  const admin = createSupabaseServiceClient();
  const { data: fila } = await admin
    .from("content_blocks")
    .upsert(
      { block_key: clave, body: parseo.data, status: "published", updated_by: userId },
      { onConflict: "block_key" },
    )
    .select("id")
    .single();

  if (!fila) destinoError(clave, "no_publicado");

  await admin.rpc("publicar_contenido", {
    p_entity_type: "content_block",
    p_entity_id: fila.id,
    p_snapshot: parseo.data,
  });

  const def = MAPA_BLOQUES.get(clave);
  for (const path of def?.paths ?? []) {
    revalidatePath(path);
  }
  if (def?.layout) revalidatePath("/", "layout");

  redirect(`/admin/contenidos/${clave}?publicado=1`);
}
