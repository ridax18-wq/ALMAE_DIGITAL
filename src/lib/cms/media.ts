import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const BUCKET = "almae-media";

export function urlPublicaMedia(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

export type OpcionImagen = { id: string; etiqueta: string; url: string };

export async function opcionesImagen(): Promise<OpcionImagen[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, storage_path, alt_text")
    .order("created_at", { ascending: false });
  return (data ?? []).map((m) => ({
    id: String(m.id),
    etiqueta: m.alt_text || String(m.storage_path).split("/").pop() || "Imagen",
    url: urlPublicaMedia(String(m.storage_path)),
  }));
}

export async function mediosEnUso(ids: string[]): Promise<Set<string>> {
  const enUso = new Set<string>();
  if (ids.length === 0) return enUso;
  const supabase = createSupabaseServiceClient();

  const consultas = [
    supabase.from("content_blocks").select("image_media_id").in("image_media_id", ids),
    supabase.from("promotions").select("image_media_id").in("image_media_id", ids),
    supabase.from("testimonials").select("media_id").in("media_id", ids),
    supabase.from("services").select("image_media_id").in("image_media_id", ids),
  ];

  const resultados = await Promise.all(consultas);
  for (const { data } of resultados) {
    for (const fila of data ?? []) {
      const id = (fila as { image_media_id?: string; media_id?: string }).image_media_id
        ?? (fila as { media_id?: string }).media_id;
      if (id) enUso.add(String(id));
    }
  }
  return enUso;
}
