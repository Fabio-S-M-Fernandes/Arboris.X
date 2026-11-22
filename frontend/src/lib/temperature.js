export function formatTemperature(celsius, digits = 1) {
  return !Number.isFinite(celsius) ? '—' : new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(celsius);
}
