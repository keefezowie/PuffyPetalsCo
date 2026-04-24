export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatRupiahDecimal(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatQuantity(value: number, unit?: string) {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
