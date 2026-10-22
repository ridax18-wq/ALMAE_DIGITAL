"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { BUCKET, mediosEnUso } from "@/lib/cms/media";
import { validarArchivo } from "@/lib/cms/media-validacion";

async function usuarioPanel() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function volver(error: string): never {
  redirect(`/admin/multimedia?error=${encodeURIComponent(error)}`);
}

export async function subirImagen(datos: FormData): Promise<void> {
  const user = await usuarioPanel();
  if (!user) redirect("/admin/login");

  const archivo = datos.get("archivo");
  if (!(archivo instanceof File)) volver("Debe seleccionar una imagen.");
  if (archivo.size === 0) volver("El archivo esta vacio.");

  const buffer = await archivo.arrayBuffer();
  const cabecera = new Uint8Array(buffer.slice(0, 16));
  const validacion = validarArchivo({
    nombre: archivo.name,
    tipo: archivo.type,
    bytes: archivo.size,
    cabecera,
  });
  if (!validacion.ok) volver(validacion.error);

  const admin = createSupabaseServiceClient();
  const contentHash = createHash("sha256").update(Buffer.from(buffer)).digest("hex");

  const { data: duplicada } = await admin
    .from("media_assets")
    .select("id")
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (duplicada) {
    redirect("/admin/multimedia?error=imagen_duplicada");
  }

  const { error: errStorage } = await admin.storage
    .from(BUCKET)
    .upload(validacion.nombre, buffer, { contentType: archivo.type, upsert: false });
  if (errStorage) volver("No se pudo subir la imagen. Intentalo de nuevo.");

  const alt = String(datos.get("alt") ?? "").slice(0, 300);
  const { error } = await admin.from("media_assets").insert({
    storage_path: validacion.nombre,
    mime_type: archivo.type,
    bytes: archivo.size,
    alt_text: alt,
    content_hash: contentHash,
    created_by: user.id,
  });
  if (error) {
    await admin.storage.from(BUCKET).remove([validacion.nombre]);
    volver("No se pudo registrar la imagen.");
  }

  revalidatePath("/admin/multimedia");
  redirect("/admin/multimedia?subida=1");
}

export async function actualizarAltMedia(datos: FormData): Promise<void> {
  const user = await usuarioPanel();
  if (!user) redirect("/admin/login");

  const id = String(datos.get("id") ?? "");
  const alt = String(datos.get("alt") ?? "").slice(0, 300);
  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from("media_assets")
    .update({ alt_text: alt })
    .eq("id", id);
  if (error) volver("No se pudo guardar el texto alternativo.");

  revalidatePath("/admin/multimedia");
  redirect("/admin/multimedia?alt=1");
}

export async function eliminarMedia(datos: FormData): Promise<void> {
  const user = await usuarioPanel();
  if (!user) redirect("/admin/login");

  const id = String(datos.get("id") ?? "");
  const admin = createSupabaseServiceClient();
  const { data: fila } = await admin
    .from("media_assets")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!fila) volver("Imagen no encontrada.");

  const enUso = await mediosEnUso([id]);
  if (enUso.size > 0) {
    volver("La imagen esta en uso por un contenido publicado y no puede eliminarse.");
  }

  await admin.storage.from(BUCKET).remove([String(fila.storage_path)]);
  const { error } = await admin.from("media_assets").delete().eq("id", id);
  if (error) volver("No se pudo eliminar la imagen.");

  revalidatePath("/admin/multimedia");
  redirect("/admin/multimedia?eliminada=1");
}
