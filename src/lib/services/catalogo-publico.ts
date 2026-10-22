import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ModalidadPublica = "consultorio" | "domicilio";

export type VariantePublica = {
  id: string;
  duracionMinutos: number;
  precioCents: number;
};

export type ServicioPublico = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  location: ModalidadPublica;
  instructions: string[];
  highlights: string[];
  reservable: boolean;
  variantes: VariantePublica[];
};

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function esModalidad(valor: string): valor is ModalidadPublica {
  return valor === "consultorio" || valor === "domicilio";
}

function listar(texto: string): string[] {
  return texto
    .split(/(?<=\.)\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

function formatearHora(hora: string): string {
  return hora.replace(/^0/, "").slice(0, 5);
}

function rangoDias(dias: number[]): string {
  if (dias.length === 0) return "";
  const primero = dias[0];
  const ultimo = dias[dias.length - 1];
  if (primero === undefined || ultimo === undefined) return "";
  if (dias.length === 1) return DIAS[primero] ?? "";
  const consecutivos = ultimo - primero + 1 === dias.length;
  if (consecutivos) {
    return `${DIAS[primero]} a ${DIAS[ultimo]?.toLowerCase() ?? ""}`;
  }
  return dias.map((d) => (d === undefined ? "" : DIAS[d] ?? "")).join(", ");
}

export async function obtenerCatalogo(): Promise<ServicioPublico[]> {
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("services")
    .select(
      "id, slug, name, description, location, instructions, tagline, highlights, variants:service_variants(id, duration_minutes, amount_cents)",
    )
    .eq("active", true)
    .order("sort_order");

  return (data ?? [])
    .filter((s) => esModalidad(s.location))
    .map((s) => {
      const variantes = (s.variants ?? [])
        .map((v) => ({
          id: String(v.id),
          duracionMinutos: v.duration_minutes,
          precioCents: v.amount_cents,
        }))
        .sort((a, b) => a.duracionMinutos - b.duracionMinutos);
      return {
        id: String(s.id),
        slug: s.slug,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        location: s.location,
        instructions: listar(s.instructions ?? ""),
        highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
        reservable: s.location === "consultorio" && variantes.length > 0,
        variantes,
      };
    });
}

export async function obtenerServicio(
  slug: string,
): Promise<ServicioPublico | null> {
  const catalogo = await obtenerCatalogo();
  return catalogo.find((s) => s.slug === slug) ?? null;
}

export async function obtenerNotaHorario(): Promise<string> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("business_hours")
      .select("day_of_week, opens_at, closes_at, break_start, break_end")
      .order("day_of_week");

    if (!data || data.length === 0) {
      throw new Error("sin horarios");
    }

    const porDia = data.map((d) => ({
      dia: d.day_of_week,
      firma: `${d.opens_at}|${d.closes_at}|${d.break_start}|${d.break_end}`,
      texto: `${formatearHora(d.opens_at)}–${formatearHora(d.closes_at)}${
        d.break_start && d.break_end
          ? ` (descanso ${formatearHora(d.break_start)}–${formatearHora(d.break_end)})`
          : ""
      }`,
    }));

    const grupos = new Map<string, { dias: number[]; texto: string }>();
    for (const d of porDia) {
      const actual = grupos.get(d.firma) ?? { dias: [], texto: d.texto };
      actual.dias.push(d.dia);
      grupos.set(d.firma, actual);
    }

    return Array.from(grupos.values())
      .sort((a, b) => (a.dias[0] ?? 0) - (b.dias[0] ?? 0))
      .map((g) => `${rangoDias(g.dias)} ${g.texto}`)
      .join(" · ");
  } catch {
    return "Horario de referencia (provisional): lunes a viernes 8:00–20:00 (descanso 13:00–16:00); sábados 9:00–13:00.";
  }
}
