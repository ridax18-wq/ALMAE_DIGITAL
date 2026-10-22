export type PromocionFechas = {
  valid_from: string | null;
  valid_to: string | null;
};

/** Vigente si: sin fechas, o el día (America/Lima, formato YYYY-MM-DD) cae dentro del rango inclusive. */
export function esPromocionVigente(promo: PromocionFechas, hoy: string): boolean {
  if (promo.valid_to && promo.valid_to < hoy) return false;
  if (promo.valid_from && promo.valid_from > hoy) return false;
  return true;
}
