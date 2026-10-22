import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { mediosEnUso, urlPublicaMedia } from "@/lib/cms/media";
import { LIMITE_BYTES, nombreSeguro, validarArchivo } from "@/lib/cms/media-validacion";

const PNG_CABECERA = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG_CABECERA = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const TXT_CABECERA = new Uint8Array([0x68, 0x6f, 0x6c, 0x61]);

describe("Multimedia — validacion de archivos (B3)", () => {
  it("acepta JPG, PNG y WebP validos", () => {
    expect(
      validarArchivo({ nombre: "foto.PNG", tipo: "image/png", bytes: 1000, cabecera: PNG_CABECERA }).ok,
    ).toBe(true);
    expect(
      validarArchivo({ nombre: "foto.jpg", tipo: "image/jpeg", bytes: 1000, cabecera: JPG_CABECERA }).ok,
    ).toBe(true);
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(
      validarArchivo({ nombre: "foto.webp", tipo: "image/webp", bytes: 1000, cabecera: webp }).ok,
    ).toBe(true);
  });

  it("rechaza tamano maximo, vacios y formatos no permitidos", () => {
    const grande = validarArchivo({
      nombre: "g.png",
      tipo: "image/png",
      bytes: LIMITE_BYTES + 1,
      cabecera: PNG_CABECERA,
    });
    expect(grande).toEqual({ ok: false, error: "La imagen supera el maximo de 5 MB." });
    expect(
      validarArchivo({ nombre: "x.png", tipo: "image/png", bytes: 0, cabecera: PNG_CABECERA }).ok,
    ).toBe(false);
    expect(
      validarArchivo({ nombre: "x.gif", tipo: "image/gif", bytes: 10, cabecera: TXT_CABECERA }).ok,
    ).toBe(false);
  });

  it("detecta contenido que no coincide con el mime declarado", () => {
    const r = validarArchivo({
      nombre: "falso.png",
      tipo: "image/png",
      bytes: 100,
      cabecera: TXT_CABECERA,
    });
    expect(r.ok).toBe(false);
  });

  it("genera nombres unicos sin rutas ni caracteres peligrosos", () => {
    const a = nombreSeguro("../../etc/passwd.png", "comercial");
    const b = nombreSeguro("foto familiar (2).PNG", "comercial");
    expect(a).not.toContain("/");
    expect(a).not.toContain("..");
    expect(b).toMatch(/^comercial-\d+-[0-9a-f]{4}-foto-familiar-2$/);
    expect(nombreSeguro("???.png", "comercial")).toMatch(/^comercial-\d+-[0-9a-f]{4}-imagen$/);
    expect(a).not.toBe(nombreSeguro("../../etc/passwd.png", "comercial"));
  });
});

describe("Multimedia — uso y URL (B3)", () => {
  const srv = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  let mediaId = "";

  beforeAll(async () => {
    const { data } = await srv
      .from("media_assets")
      .insert({
        storage_path: "comercial/test-en-uso.png",
        mime_type: "image/png",
        bytes: 100,
        alt_text: "prueba b3",
      })
      .select("id")
      .single();
    mediaId = String(data?.id);
    await srv
      .from("content_blocks")
      .update({ image_media_id: mediaId })
      .eq("block_key", "hero_home");
  });

  afterAll(async () => {
    await srv.from("content_blocks").update({ image_media_id: null }).eq("block_key", "hero_home");
    await srv.from("media_assets").delete().eq("id", mediaId);
  });

  it("detecta imagenes en uso por contenido publicado", async () => {
    const enUso = await mediosEnUso([mediaId]);
    expect(enUso.has(mediaId)).toBe(true);
    const libre = await mediosEnUso(["00000000-0000-0000-0000-000000000000"]);
    expect(libre.size).toBe(0);
  });

  it("construye la URL publica del bucket", () => {
    const url = urlPublicaMedia("comercial/x.png");
    expect(url).toContain("/storage/v1/object/public/almae-media/comercial/x.png");
  });
});
