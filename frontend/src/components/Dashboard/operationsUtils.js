import { enrichAlert } from './alertUtils';

export function parseRelativeMinutes(value) {
  const match = String(value || '').match(/(\d+)\s*(min|h|dia)/iu);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1]);
  if (match[2].toLocaleLowerCase('pt-BR') === 'h') return amount * 60;
  if (match[2].toLocaleLowerCase('pt-BR') === 'dia') return amount * 1440;
  return amount;
}

export function getLocationStatus(sensors) {
  const statuses = sensors.map((sensor) => sensor.estado).filter(Boolean);
  if (statuses.includes('Crítico')) return 'Crítico';
  if (statuses.includes('Atenção')) return 'Atenção';
  if (statuses.length > 0 && statuses.every((status) => status === 'Estável')) return 'Estável';
  return 'Sem classificação';
}

const average = (values) => {
  const validValues = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  return validValues.length ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length : null;
};

export function buildLocations(sensors, alerts) {
  const groupedLocations = new Map();
  const enrichedAlerts = alerts.map((alert) => enrichAlert(alert, sensors));

  sensors.forEach((sensor) => {
    if (!sensor.local) return;
    const current = groupedLocations.get(sensor.local) || {
      name: sensor.local,
      region: sensor.regiao || 'Região não disponível',
      sensors: [],
    };
    current.sensors.push(sensor);
    groupedLocations.set(sensor.local, current);
  });

  return [...groupedLocations.values()].map((location) => {
    const locationAlerts = enrichedAlerts.filter((alert) => alert.local === location.name);
    const latestSensor = [...location.sensors].sort((first, second) => parseRelativeMinutes(first.atualizacao) - parseRelativeMinutes(second.atualizacao))[0];
    return {
      ...location,
      alerts: locationAlerts,
      status: getLocationStatus(location.sensors),
      temperature: average(location.sensors.map((sensor) => sensor.temperatura)),
      humidity: average(location.sensors.map((sensor) => sensor.umidade)),
      updatedAt: latestSensor?.atualizacao || 'Não disponível',
    };
  });
}

export function formatLocationTemperature(value) {
  if (!Number.isFinite(Number(value))) return 'Não disponível';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°C`;
}

export function formatLocationHumidity(value) {
  if (!Number.isFinite(Number(value))) return 'Não disponível';
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}
