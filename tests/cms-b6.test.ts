import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  compararSnapshots,
  obtenerHistorialRevisiones,
  obtenerRevisionAnterior,
  restaurarRevision,
} from "@/lib/cms/revisiones-historial";

describe("Historial de revisiones — utilidades puras (B6)", () => {
  it("compararSnapshots detecta claves cambiadas, añadidas y eliminadas", () => {
    const diffs = compararSnapshots(
      { titulo: "Antes", descripcion: "texto viejo", eliminada: "x" },
      { titulo: "Después", descripcion: "texto viejo", nueva: "y" },
    );
    const claves = diffs.map((d) => d.clave).sort();
    expect(claves).toEqual(["eliminada", "nueva", "titulo"]);
    const titulo = diffs.find((d) => d.clave === "titulo");
    expect(titulo?.anterior).toBe("Antes");
    expect(titulo?.actual).toBe("Después");
  });

  it("compararSnapshots con snapshots iguales devuelve vacío", () => {
    expect(compararSnapshots({ a: 1, b: "x" }, { a: 1, b: "x" })).toEqual([]);
  });
});

describe("Historial de revisiones — BD (B6)", () => {
  const srv = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let actorId = "";
  let idBloque = "";
  let idRev1 = "";
  let introOriginal = "";
  let bodyOriginal: Record<string, unknown> | null = null;

  beforeAll(async () => {
    const { data: admin } = await srv.auth.admin.listUsers({ perPage: 1 });
    actorId = String(admin?.users[0]?.id ?? "");

    const { data: bloque } = await srv
      .from("content_blocks")
      .select("id, body")
      .eq("block_key", "footer_intro")
      .maybeSingle();
    idBloque = String(bloque?.id ?? "");
    bodyOriginal = (bloque?.body ?? null) as Record<string, unknown> | null;

    const { data: settings } = await srv
      .from("business_settings")
      .select("local_intro")
      .limit(1)
      .maybeSingle();
    introOriginal = String(settings?.local_intro ?? "");

    await srv.from("content_revisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const cuerpoV1 = { ...(bodyOriginal ?? {}), text: "VERSION 1 B6" };
    const { data: r1 } = await srv.from("content_revisions").insert({
      entity_type: "content_block",
      entity_id: idBloque,
      snapshot: cuerpoV1,
      created_by: actorId,
    }).select("id").single();
    idRev1 = String(r1?.id);

    await new Promise((r) => setTimeout(r, 1100));

    const cuerpoV2 = { ...(bodyOriginal ?? {}), text: "VERSION 2 B6" };
    await srv.from("content_revisions").insert({
      entity_type: "content_block",
      entity_id: idBloque,
      snapshot: cuerpoV2,
      created_by: actorId,
    });
  });

  afterAll(async () => {
    await srv.from("content_revisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (bodyOriginal) {
      await srv.from("content_blocks").update({ body: bodyOriginal }).eq("id", idBloque);
    }
    await srv.from("business_settings").update({ local_intro: introOriginal }).neq("id", "00000000-0000-0000-0000-000000000000");
  });

  it("el anon no puede leer el historial de revisiones", async () => {
    const { data } = await anon.from("content_revisions").select("id").limit(10);
    expect((data ?? []).length).toBe(0);
  });

  it("el historial muestra fecha, autor y etiqueta", async () => {
    const historial = await obtenerHistorialRevisiones({ limit: 10 });
    expect(historial.length).toBeGreaterThanOrEqual(2);
    const rev = historial.find((r) => r.id === idRev1);
    expect(rev).toBeDefined();
    expect(rev?.createdAt).toBeTruthy();
    expect(rev?.autorEmail).toContain("@");
    expect(rev?.etiqueta).toContain("footer_intro");
  });

  it("comparar versión actual con la anterior desde BD", async () => {
    const historial = await obtenerHistorialRevisiones({ limit: 10 });
    const v2 = historial.find((r) => (r.snapshot as { text?: string }).text === "VERSION 2 B6");
    expect(v2).toBeDefined();
    const anterior = await obtenerRevisionAnterior(v2!);
    expect(anterior?.id).toBe(idRev1);
  });

  it("restaurar una versión aplica el contenido y genera una nueva revisión sin borrar historial", async () => {
    const antes = await obtenerHistorialRevisiones({ limit: 50 });
    const totalAntes = antes.length;

    const resultado = await restaurarRevision(idRev1, actorId);
    expect(resultado.ok).toBe(true);

    const { data: bloque } = await srv
      .from("content_blocks")
      .select("body, status")
      .eq("id", idBloque)
      .maybeSingle();
    expect((bloque?.body as { text?: string }).text).toBe("VERSION 1 B6");
    expect(bloque?.status).toBe("published");

    const despues = await obtenerHistorialRevisiones({ limit: 50 });
    expect(despues.length).toBe(totalAntes + 1);
    const rev1Sigue = despues.find((r) => r.id === idRev1);
    expect(rev1Sigue).toBeDefined();
  });

  it("publicar después de restaurar sigue funcionando (nueva revisión encima)", async () => {
    await srv.from("content_blocks").update({ body: { text: "VERSION 3 B6 tras restaurar" }, status: "published" }).eq("id", idBloque);
    await new Promise((r) => setTimeout(r, 1100));
    const { error } = await srv.from("content_revisions").insert({
      entity_type: "content_block",
      entity_id: idBloque,
      snapshot: { text: "VERSION 3 B6 tras restaurar" },
      created_by: actorId,
    });
    expect(error).toBeNull();

    const historial = await obtenerHistorialRevisiones({ limit: 50 });
    const v3 = historial.find(
      (r) => (r.snapshot as { text?: string }).text === "VERSION 3 B6 tras restaurar",
    );
    expect(v3).toBeDefined();
    const anterior = await obtenerRevisionAnterior(v3!);
    expect(anterior).not.toBeNull();
  });
});
