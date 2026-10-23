export function DemoBanner() {
  if (process.env.NODE_ENV === "production") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const esLocal =
    supabaseUrl.includes("127.0.0.1") ||
    supabaseUrl.includes("localhost") ||
    supabaseUrl === "";

  if (!esLocal) return null;

  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
      Entorno de prueba ALMAE — Los cambios realizados aquí no afectan la página
      publicada.
    </div>
  );
}
