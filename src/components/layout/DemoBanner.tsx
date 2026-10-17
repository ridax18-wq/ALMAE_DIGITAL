export function DemoBanner() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
      En preparación — precios y horarios provisionales hasta confirmar los
      montos y agenda oficiales de ALMAE.
    </div>
  );
}
