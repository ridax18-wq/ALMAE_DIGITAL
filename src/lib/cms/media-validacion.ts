export const LIMITE_BYTES = 5 * 1024 * 1024;

export const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"] as const;

export type ResultadoValidacion =
  | { ok: true; nombre: string }
  | { ok: false; error: string };

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function coincideCabecera(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    );
  }
  if (mime === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

/** Nombre de archivo seguro: sin rutas ni puntos, solo [a-z0-9-], único por marca de tiempo. */
export function nombreSeguro(original: string, prefijo: string): string {
  const base = original
    .normalize("NFKD")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const limpio = base || "imagen";
  const azar = Math.random().toString(16).slice(2, 6);
  return `${prefijo}-${Date.now()}-${azar}-${limpio}`;
}

export function validarArchivo(opts: {
  nombre: string;
  tipo: string;
  bytes: number;
  cabecera: Uint8Array;
}): ResultadoValidacion {
  if (opts.bytes <= 0) {
    return { ok: false, error: "El archivo esta vacio." };
  }
  if (opts.bytes > LIMITE_BYTES) {
    return { ok: false, error: "La imagen supera el maximo de 5 MB." };
  }
  if (!(MIME_PERMITIDOS as readonly string[]).includes(opts.tipo)) {
    return { ok: false, error: "Formato no permitido. Usa JPG, PNG o WebP." };
  }
  if (!coincideCabecera(opts.cabecera, opts.tipo)) {
    return { ok: false, error: "El contenido del archivo no coincide con el formato indicado." };
  }
  const extension = EXTENSIONES[opts.tipo] ?? "img";
  const prefijo = `comercial/${opts.tipo.replace("/", "-")}`;
  const nombre = nombreSeguro(opts.nombre, prefijo) + "." + extension;
  return { ok: true, nombre };
}
