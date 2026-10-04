export const TODAS_AS_REGIOES = 'Todas as regiões';

export const THERMAL_LEVELS = {
  cool: { label: 'Mais ameno', status: 'Ameno' },
  intermediate: { label: 'Intermediário', status: 'Intermediário' },
  hot: { label: 'Mais quente', status: 'Mais quente' },
};

export function getThermalLevel(value) {
  if (Number(value) <= 40) return 'cool';
  if (Number(value) <= 70) return 'intermediate';
  return 'hot';
}

export function getThermalLabel(value) {
  return THERMAL_LEVELS[getThermalLevel(value)].label;
}

export function formatTemperature(value) {
  if (!Number.isFinite(Number(value))) return 'Não disponível';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°C`;
}

export function formatUpdatedAt(timestamp) {
  if (!timestamp) return 'Não disponível';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Não disponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function getRegionRank(zones, selectedZone) {
  if (!selectedZone || zones.length === 0) return 'Não disponível';
  const ranking = [...zones].sort((first, second) => Number(second.temperatura) - Number(first.temperatura));
  const position = ranking.findIndex((zone) => zone.regiao === selectedZone.regiao);
  return position === -1 ? 'Não disponível' : `${position + 1}ª de ${ranking.length}`;
}

