export const TEMPERATURE_UNITS = ['C', 'F', 'K'];

export function convertTemperature(celsius, unit = 'C') {
  if (!Number.isFinite(celsius)) return null;
  if (unit === 'F') return celsius * 9 / 5 + 32;
  if (unit === 'K') return celsius + 273.15;
  return celsius;
}

export function toCelsius(value, unit = 'C') {
  if (!Number.isFinite(value)) return null;
  if (unit === 'F') return (value - 32) * 5 / 9;
  if (unit === 'K') return value - 273.15;
  return value;
}

export function temperatureSymbol(unit = 'C') {
  return unit === 'K' ? 'K' : `°${unit}`;
}

export function formatTemperature(celsius, unit = 'C', digits = 1) {
  const converted = convertTemperature(celsius, unit);
  return converted === null ? '—' : new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(converted);
}
