import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { urlPublicaMedia } from "@/lib/cms/media";

export type TestimonioPublico = {
  id: string;
  patientName: string;
  quote: string;
  rating: number | null;
  foto: string | null;
};

export async function obtenerTestimonios(): Promise<TestimonioPublico[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("testimonials")
    .select(
      "id, patient_name, quote, rating, media:media_assets!testimonials_media_id_fkey(storage_path)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);

  return (data ?? []).map((t) => {
    const mediaPath = Array.isArray(t.media)
      ? (t.media[0] as { storage_path?: string } | undefined)?.storage_path
      : (t.media as { storage_path?: string } | null)?.storage_path;
    return {
      id: String(t.id),
      patientName: t.patient_name,
      quote: t.quote,
      rating: t.rating,
      foto: mediaPath ? urlPublicaMedia(mediaPath) : null,
    };
  });
}
