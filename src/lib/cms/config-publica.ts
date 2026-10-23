import { cache } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ConfiguracionPublica = {
  direccionCalle: string;
  direccionDistrito: string;
  direccionProvincia: string;
  direccionDepartamento: string;
  direccionReferencia: string;
  direccionCompleta: string;
  introLocal: string;
  mapsUrl: string;
  whatsapp: string;
  whatsappMensaje: string;
  telefono: string;
  email: string;
  instagramUrl: string;
  facebookUrl: string;
  hoursNote: string;
};

const VACIO = {
  direccionCalle: "",
  direccionDistrito: "",
  direccionProvincia: "",
  direccionDepartamento: "",
  direccionReferencia: "",
  direccionCompleta: "",
  introLocal: "",
  mapsUrl: "",
  whatsapp: "",
  whatsappMensaje: "",
  telefono: "",
  email: "",
  instagramUrl: "",
  facebookUrl: "",
  hoursNote: "",
} satisfies ConfiguracionPublica;

export function direccionCompleta(cfg: {
  calle: string;
  distrito: string;
  provincia: string;
  departamento: string;
}): string {
  return [cfg.calle, cfg.distrito, cfg.provincia, cfg.departamento]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

const HOSTS_MAPS = [
  "google.com",
  "www.google.com",
  "maps.google.com",
  "www.google.com.pe",
  "google.com.pe",
  "goo.gl",
  "maps.app.goo.gl",
];

/** Solo https y dominios de Google Maps; sin javascript:/data:/hosts desconocidos. */
export function esUrlMapsSegura(url: string): boolean {
  const limpia = url.trim();
  if (!limpia) return false;
  let parsed: URL;
  try {
    parsed = new URL(limpia);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (!HOSTS_MAPS.includes(host)) {
    if (!host.endsWith(".google.com") && !host.endsWith(".google.com.pe")) return false;
  }
  return true;
}

export function urlBusquedaMaps(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

function queryDesdeMapsUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const q = parsed.searchParams.get("q") ?? parsed.searchParams.get("query");
    if (q && q.trim()) return q.trim();
    const match = parsed.pathname.match(/\/place\/([^/]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]).replace(/\+/g, " ").trim();
  } catch {
    return null;
  }
  return null;
}

/**
 * URL de "Cómo llegar": la de Maps si es segura; si no, búsqueda por dirección.
 */
export function urlComoLlegar(mapsUrl: string, direccion: string): string {
  if (esUrlMapsSegura(mapsUrl)) return mapsUrl.trim();
  return urlBusquedaMaps(direccion);
}

/** URL embebible del mapa (búsqueda por query configurable; nunca coordenadas inventadas). */
export function urlEmbedMaps(mapsUrl: string, direccion: string): string {
  const query = esUrlMapsSegura(mapsUrl) ? queryDesdeMapsUrl(mapsUrl) : null;
  const texto = query ?? direccion;
  if (!texto.trim()) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(texto)}&output=embed`;
}

export const obtenerConfiguracionPublica = cache(
  async (): Promise<ConfiguracionPublica> => {
    try {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase
        .from("business_settings")
        .select(
          "address_street, address_district, address_province, address_department, address_reference, maps_url, local_intro, whatsapp_number, whatsapp_message, phone, email, instagram_url, facebook_url, hours_note",
        )
        .limit(1)
        .maybeSingle();
      if (!data) return { ...VACIO };

      const calle = String(data.address_street ?? "");
      const distrito = String(data.address_district ?? "");
      const provincia = String(data.address_province ?? "");
      const departamento = String(data.address_department ?? "");

      return {
        direccionCalle: calle,
        direccionDistrito: distrito,
        direccionProvincia: provincia,
        direccionDepartamento: departamento,
        direccionReferencia: String(data.address_reference ?? ""),
        direccionCompleta: direccionCompleta({
          calle,
          distrito,
          provincia,
          departamento,
        }),
        introLocal: String(data.local_intro ?? ""),
        mapsUrl: String(data.maps_url ?? ""),
        whatsapp: String(data.whatsapp_number ?? "").replace(/[^\d]/g, ""),
        whatsappMensaje: String(data.whatsapp_message ?? ""),
        telefono: String(data.phone ?? ""),
        email: String(data.email ?? ""),
        instagramUrl: String(data.instagram_url ?? ""),
        facebookUrl: String(data.facebook_url ?? ""),
        hoursNote: String(data.hours_note ?? ""),
      };
    } catch {
      return { ...VACIO };
    }
  },
);
