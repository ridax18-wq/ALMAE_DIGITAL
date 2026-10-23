import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type SeccionConfig = "ubicacion" | "contacto" | "horarios";

export type BorradorConfig<T> = {
  id: string;
  valores: T;
  creadoEn: string;
};

async function idSettings(supabase: ReturnType<typeof createSupabaseServiceClient>): Promise<string> {
  const { data } = await supabase
    .from("business_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (data) return String(data.id);
  const { data: nuevo } = await supabase
    .from("business_settings")
    .insert({})
    .select("id")
    .single();
  return String(nuevo?.id ?? "");
}

type FilaRevision<T> = {
  id: string;
  snapshot: { seccion: string; estado: string; valores: T };
  created_at: string;
};

type BorradorEncontrado<T> = {
  id: string;
  valores: T;
  creadoEn: string;
};

function aBorrador<T>(fila: FilaRevision<T>): BorradorEncontrado<T> {
  return {
    id: String(fila.id),
    valores: fila.snapshot.valores,
    creadoEn: String(fila.created_at),
  };
}

/** Último borrador guardado de una sección (solo visible para admin por RLS de content_revisions). */
export async function obtenerBorrador<T>(seccion: SeccionConfig): Promise<BorradorConfig<T> | null> {
  const fila = (await ultimaRevision<T>(seccion, "borrador"))?.fila;
  if (!fila) return null;
  return aBorrador(fila);
}

async function ultimaRevision<T>(
  seccion: SeccionConfig,
  estado: "borrador" | "publicado",
): Promise<{ fila: FilaRevision<T>; supabase: ReturnType<typeof createSupabaseServiceClient>; settingsId: string } | null> {
  const supabase = createSupabaseServiceClient();
  const settingsId = await idSettings(supabase);
  const { data } = await supabase
    .from("content_revisions")
    .select("id, snapshot, created_at")
    .eq("entity_type", "business_settings")
    .eq("entity_id", settingsId)
    .order("created_at", { ascending: false })
    .limit(20);

  const fila = ((data ?? []) as unknown as FilaRevision<T>[]).find(
    (r) => r.snapshot?.seccion === seccion && r.snapshot?.estado === estado,
  );
  return fila ? { fila, supabase, settingsId } : null;
}

async function idsDeSeccion(seccion: SeccionConfig, estado?: "borrador" | "publicado"): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const settingsId = await idSettings(supabase);
  const { data } = await supabase
    .from("content_revisions")
    .select("id, snapshot")
    .eq("entity_type", "business_settings")
    .eq("entity_id", settingsId)
    .limit(50);
  return ((data ?? []) as { id: string; snapshot: { seccion?: string; estado?: string } }[])
    .filter(
      (fila) =>
        fila.snapshot?.seccion === seccion &&
        (estado === undefined || fila.snapshot?.estado === estado),
    )
    .map((fila) => fila.id);
}

/** Reemplaza el borrador de la sección (borra los anteriores). */
export async function guardarBorrador<T>(
  seccion: SeccionConfig,
  valores: T,
  actorUserId: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const settingsId = await idSettings(supabase);

  const borradoresPrevios = await idsDeSeccion(seccion, "borrador");
  if (borradoresPrevios.length > 0) {
    await supabase.from("content_revisions").delete().in("id", borradoresPrevios);
  }

  await supabase.from("content_revisions").insert({
    entity_type: "business_settings",
    entity_id: settingsId,
    snapshot: { seccion, estado: "borrador", valores },
    created_by: actorUserId,
  });
}

/** Publica el borrador de la sección: registra revisión publicada y limpia borradores. */
export async function publicarBorrador(
  seccion: SeccionConfig,
  actorUserId: string,
): Promise<boolean> {
  const borrador = await obtenerBorrador<Record<string, string>>(seccion);
  if (!borrador) return false;

  const supabase = createSupabaseServiceClient();
  const settingsId = await idSettings(supabase);

  const { error } = await supabase
    .from("business_settings")
    .update(borrador.valores)
    .eq("id", settingsId);
  if (error) return false;

  const borradores = await idsDeSeccion(seccion, "borrador");
  if (borradores.length > 0) {
    await supabase.from("content_revisions").delete().in("id", borradores);
  }

  await supabase.from("content_revisions").insert({
    entity_type: "business_settings",
    entity_id: settingsId,
    snapshot: { seccion, estado: "publicado", valores: borrador.valores },
    created_by: actorUserId,
  });

  return true;
}

export async function descartarBorrador(seccion: SeccionConfig): Promise<void> {
  const borradores = await idsDeSeccion(seccion, "borrador");
  if (borradores.length === 0) return;
  const supabase = createSupabaseServiceClient();
  await supabase.from("content_revisions").delete().in("id", borradores);
}
