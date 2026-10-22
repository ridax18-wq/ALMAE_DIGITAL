import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "almae-media";
const DIR_ORIGEN = path.resolve("public/servicios");
const PREFIJO = "comercial";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const archivos = (await readdir(DIR_ORIGEN)).filter((n) => MIME[path.extname(n).toLowerCase()]);
let subidas = 0;
let duplicadas = 0;
let enlazadas = 0;

for (const nombre of archivos) {
  const slug = nombre.replace(/\.[^.]+$/, "");
  const ruta = path.join(DIR_ORIGEN, nombre);
  const buffer = await readFile(ruta);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const mime = MIME[path.extname(nombre).toLowerCase()];

  const { data: existente } = await supabase
    .from("media_assets")
    .select("id, storage_path")
    .eq("content_hash", hash)
    .maybeSingle();

  let mediaId = existente ? String(existente.id) : null;

  if (!existente) {
    const storagePath = `${PREFIJO}/servicio-${slug}${path.extname(nombre).toLowerCase()}`;
    const { error: errUp } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mime, upsert: false });
    if (errUp) {
      console.error(`ERROR subida ${storagePath}: ${errUp.message}`);
      continue;
    }
    const { data: fila, error: errInsert } = await supabase
      .from("media_assets")
      .insert({
        storage_path: storagePath,
        mime_type: mime,
        bytes: buffer.length,
        alt_text: `Servicio ${slug.replaceAll("-", " ")}`,
        content_hash: hash,
      })
      .select("id")
      .single();
    if (errInsert || !fila) {
      console.error(`ERROR registro media ${storagePath}: ${errInsert?.message}`);
      continue;
    }
    mediaId = String(fila.id);
    subidas += 1;
    console.log(`subida ${storagePath}`);
  } else {
    duplicadas += 1;
    console.log(`duplicada (hash coincide) ${existente.storage_path}, reutilizada`);
  }

  const { data: servicio } = await supabase
    .from("services")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (servicio && mediaId) {
    const { error } = await supabase
      .from("services")
      .update({ image_media_id: mediaId })
      .eq("id", servicio.id);
    if (error) console.error(`ERROR enlace servicio ${slug}: ${error.message}`);
    else {
      enlazadas += 1;
      console.log(`enlazado ${slug} -> media ${mediaId}`);
    }
  } else {
    console.warn(`sin servicio con slug ${slug} para enlazar`);
  }
}

console.log(`Listo: ${subidas} subidas, ${duplicadas} duplicadas reutilizadas, ${enlazadas} servicios enlazados.`);
