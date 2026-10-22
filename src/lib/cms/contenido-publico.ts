import { cache } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  cuerpoDefecto,
  esquemas,
  type ClaveBloque,
  type CuerpoBloque,
} from "@/lib/cms/bloques";

export async function obtenerCuerpoPublicado<K extends ClaveBloque>(
  clave: K,
): Promise<CuerpoBloque<K>> {
  const defecto = cuerpoDefecto(clave);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("content_blocks")
    .select("body")
    .eq("block_key", clave)
    .eq("status", "published")
    .maybeSingle();

  if (!data?.body) return defecto;

  const resultado = esquemas[clave].safeParse(data.body);
  return resultado.success ? (resultado.data as CuerpoBloque<K>) : defecto;
}

export const obtenerCuerpoPublicadoCacheado = cache(obtenerCuerpoPublicado);
