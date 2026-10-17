export function formatPen(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2);
  const parts = fixed.split(".");
  const entera = parts[0] ?? "0";
  const decimales = parts[1] ?? "00";
  const miles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = amount < 0 ? "-" : "";
  return `${signo}S/ ${miles},${decimales}`;
}
