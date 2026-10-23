import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { MAPA_BLOQUES } from "@/lib/cms/bloques";

export type RevisionHistorial = {
  id: string;
  entityType: string;
  entityId: string;
  snapshot: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  autorEmail: string | null;
  etiqueta: string;
};

function etiquetaDesde(entityType: string, snapshot: Record<string, unknown>, blockKey?: string): string {
  if (entityType === "content_block") {
    return `Bloque: ${blockKey ?? String(snapshot.block_key ?? "desconocido")}`;
  }
  if (entityType === "business_settings") {
    const seccion = String(snapshot.seccion ?? "config");
    return `Configuración: ${seccion}`;
  }
  if (entityType === "promotion") return "Promoción";
  if (entityType === "testimonial") return "Testimonio";
  if (entityType === "media_asset") return "Multimedia";
  return entityType;
}

export async function obtenerHistorialRevisiones(
  opciones?: { entityType?: string; limit?: number },
): Promise<RevisionHistorial[]> {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("content_revisions")
    .select("id, entity_type, entity_id, snapshot, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(opciones?.limit ?? 100);
  if (opciones?.entityType) query = query.eq("entity_type", opciones.entityType);
  const { data: filas } = await query;
  if (!filas || filas.length === 0) return [];

  const idsBloque = [
    ...new Set(
      filas
        .filter((f) => f.entity_type === "content_block")
        .map((f) => String(f.entity_id)),
    ),
  ];
  let mapaBloques = new Map<string, string>();
  if (idsBloque.length > 0) {
    const { data: bloques } = await supabase
      .from("content_blocks")
      .select("id, block_key")
      .in("id", idsBloque);
    mapaBloques = new Map((bloques ?? []).map((b) => [String(b.id), String(b.block_key)]));
  }

  const idsAutor = [...new Set(filas.map((f) => f.created_by).filter(Boolean))] as string[];
  let mapaAutores = new Map<string, string>();
  if (idsAutor.length > 0) {
    const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 200 });
    mapaAutores = new Map(
      (lista?.users ?? [])
        .filter((u) => idsAutor.includes(u.id))
        .map((u) => [u.id, u.email ?? u.id]),
    );
  }

  return filas.map((fila) => {
    const snapshot = (fila.snapshot ?? {}) as Record<string, unknown>;
    const blockKey = mapaBloques.get(String(fila.entity_id));
    return {
      id: String(fila.id),
      entityType: String(fila.entity_type),
      entityId: String(fila.entity_id),
      snapshot,
      createdBy: fila.created_by,
      createdAt: String(fila.created_at),
      autorEmail: fila.created_by ? mapaAutores.get(fila.created_by) ?? null : null,
      etiqueta: etiquetaDesde(String(fila.entity_type), snapshot, blockKey),
    };
  });
}

export async function obtenerRevision(id: string): Promise<RevisionHistorial | null> {
  const historial = await obtenerHistorialRevisiones({ limit: 200 });
  return historial.find((r) => r.id === id) ?? null;
}

/** Revisión anterior de la misma entidad (para comparar). */
export async function obtenerRevisionAnterior(
  revision: RevisionHistorial,
): Promise<RevisionHistorial | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("content_revisions")
    .select("id, entity_type, entity_id, snapshot, created_by, created_at")
    .eq("entity_type", revision.entityType)
    .eq("entity_id", revision.entityId)
    .lt("created_at", revision.createdAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const snapshot = (data.snapshot ?? {}) as Record<string, unknown>;
  let autorEmail: string | null = null;
  if (data.created_by) {
    const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 200 });
    autorEmail = lista?.users?.find((u) => u.id === data.created_by)?.email ?? null;
  }
  let blockKey: string | undefined;
  if (data.entity_type === "content_block") {
    const { data: bloque } = await supabase
      .from("content_blocks")
      .select("block_key")
      .eq("id", data.entity_id)
      .maybeSingle();
    blockKey = bloque?.block_key;
  }
  return {
    id: String(data.id),
    entityType: String(data.entity_type),
    entityId: String(data.entity_id),
    snapshot,
    createdBy: data.created_by,
    createdAt: String(data.created_at),
    autorEmail,
    etiqueta: etiquetaDesde(String(data.entity_type), snapshot, blockKey),
  };
}

export type CampoDiferencia = {
  clave: string;
  anterior: unknown;
  actual: unknown;
};

/** Compara dos snapshots planos (claves de primer nivel). */
export function compararSnapshots(
  anterior: Record<string, unknown>,
  actual: Record<string, unknown>,
): CampoDiferencia[] {
  const claves = [...new Set([...Object.keys(anterior), ...Object.keys(actual)])];
  const diferencias: CampoDiferencia[] = [];
  for (const clave of claves) {
    const a = JSON.stringify(anterior[clave] ?? null);
    const b = JSON.stringify(actual[clave] ?? null);
    if (a !== b) {
      diferencias.push({ clave, anterior: anterior[clave] ?? null, actual: actual[clave] ?? null });
    }
  }
  return diferencias;
}

export type ResultadoRestauracion = {
  ok: boolean;
  error?: string;
  revalidatePath?: string;
};

/** Restaura una versión previa: aplica el snapshot y genera una nueva revisión (sin borrar historial). */
export async function restaurarRevision(
  revisionId: string,
  actorUserId: string,
): Promise<ResultadoRestauracion> {
  const supabase = createSupabaseServiceClient();

  const { data: rev } = await supabase
    .from("content_revisions")
    .select("id, entity_type, entity_id, snapshot")
    .eq("id", revisionId)
    .maybeSingle();
  if (!rev) return { ok: false, error: "revision_no_encontrada" };

  const snapshot = (rev.snapshot ?? {}) as Record<string, unknown>;
  const entityType = String(rev.entity_type);
  const entityId = String(rev.entity_id);

  if (entityType === "content_block") {
    const { data: bloque } = await supabase
      .from("content_blocks")
      .select("id, block_key")
      .eq("id", entityId)
      .maybeSingle();
    if (!bloque) return { ok: false, error: "bloque_no_encontrado" };

    const { error } = await supabase
      .from("content_blocks")
      .update({ body: snapshot, status: "published", updated_by: actorUserId })
      .eq("id", entityId);
    if (error) return { ok: false, error: error.message };

    await supabase.from("content_revisions").insert({
      entity_type: "content_block",
      entity_id: entityId,
      snapshot,
      created_by: actorUserId,
    });

    const def = MAPA_BLOQUES.get(String(bloque.block_key));
    return { ok: true, revalidatePath: def?.paths?.[0] ?? "/" };
  }

  if (entityType === "business_settings") {
    const valores = (snapshot.valores ?? snapshot) as Record<string, unknown>;
    const { error } = await supabase
      .from("business_settings")
      .update(valores)
      .eq("id", entityId);
    if (error) return { ok: false, error: error.message };

    await supabase.from("content_revisions").insert({
      entity_type: "business_settings",
      entity_id: entityId,
      snapshot: { ...snapshot, restaurado_de: revisionId },
      created_by: actorUserId,
    });

    return { ok: true, revalidatePath: "/" };
  }

  return { ok: false, error: "tipo_no_soportado" };
}
