// =====================================================================
// ALMAE DIGITAL — 4.3: respaldo independiente de Supabase Storage.
// Descarga todos los objetos de todos los buckets a una carpeta local
// (por fecha), conservando nombres y rutas originales.
// Uso: node scripts/backup-storage.mjs [carpeta_destino]
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// No sube nada ni modifica el bucket: solo lectura.
// =====================================================================
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const envLocal = ".env.local";
if (existsSync(envLocal)) {
  for (const linea of readFileSync(envLocal, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY (solo server-side/local).");
  process.exit(1);
}

const destinoBase =
  process.argv[2] ??
  path.join("backups", "storage", new Date().toISOString().replace(/[:.]/g, "-"));

const cliente = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: buckets, error: errorBuckets } = await cliente.storage.listBuckets();
if (errorBuckets) {
  console.error(`No se pudo listar buckets: ${errorBuckets.message}`);
  process.exit(1);
}

let objetosTotal = 0;

for (const bucket of buckets) {
  const pendientes = [""];
  while (pendientes.length > 0) {
    const carpeta = pendientes.pop();
    const { data: entradas, error } = await cliente.storage
      .from(bucket.name)
      .list(carpeta, { limit: 1000 });
    if (error) {
      console.error(`[${bucket.name}/${carpeta}] error: ${error.message}`);
      process.exit(1);
    }
    for (const entrada of entradas ?? []) {
      const ruta = carpeta ? `${carpeta}/${entrada.name}` : entrada.name;
      if (entrada.id === null) {
        pendientes.push(ruta);
        continue;
      }
      const { data: archivo, error: errorDescarga } = await cliente.storage
        .from(bucket.name)
        .download(ruta);
      if (errorDescarga || !archivo) {
        console.error(`[${bucket.name}] no se pudo descargar ${ruta}`);
        process.exit(1);
      }
      const destino = path.join(destinoBase, bucket.name, ruta);
      await mkdir(path.dirname(destino), { recursive: true });
      await writeFile(destino, Buffer.from(await archivo.arrayBuffer()));
      objetosTotal += 1;
    }
  }
  console.log(`[${bucket.name}] respaldado`);
}

console.log(`Storage respaldado: ${objetosTotal} objetos en ${destinoBase}`);
