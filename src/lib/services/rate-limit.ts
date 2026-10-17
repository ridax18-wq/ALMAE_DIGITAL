type Bucket = { desde: number; cuenta: number };

const buckets = new Map<string, Bucket>();

/**
 * Limitador de tasa en memoria (por instancia). Suficiente para el despliegue
 * de una instancia en desarrollo; para producción distribuida se intercambiará
 * por Upstash Redis (ver .env.example).
 */
export function limitarLlamadas(
  llave: string,
  maximo: number,
  ventanaMs: number,
): { permitido: boolean; reintentaEnMs: number } {
  const ahora = Date.now();
  const bucket = buckets.get(llave);

  if (!bucket || ahora - bucket.desde >= ventanaMs) {
    buckets.set(llave, { desde: ahora, cuenta: 1 });
    return { permitido: true, reintentaEnMs: 0 };
  }

  bucket.cuenta += 1;

  if (bucket.cuenta > maximo) {
    return {
      permitido: false,
      reintentaEnMs: ventanaMs - (ahora - bucket.desde),
    };
  }

  return { permitido: true, reintentaEnMs: 0 };
}

export function ipDelCliente(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const primera = forwarded.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}
