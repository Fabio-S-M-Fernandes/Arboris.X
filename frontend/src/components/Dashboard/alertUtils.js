const SENSOR_ID_PATTERN = /\b[A-Z]{3}-\d{3}\b/i;

function findSensor(alert, sensors) {
  const source = `${alert.titulo || ''} ${alert.descricao || ''}`;
  const sensorId = source.match(SENSOR_ID_PATTERN)?.[0]?.toUpperCase();
  if (sensorId) {
    const sensorById = sensors.find((sensor) => sensor.id?.toUpperCase() === sensorId);
    if (sensorById) return sensorById;
  }

  return sensors.find((sensor) => sensor.local && source.toLocaleLowerCase('pt-BR').includes(sensor.local.toLocaleLowerCase('pt-BR')));
}

export function enrichAlert(alert, sensors = []) {
  const sensor = findSensor(alert, sensors);
  const source = `${alert.titulo || ''} ${alert.descricao || ''}`;
  const sensorId = sensor?.id || source.match(SENSOR_ID_PATTERN)?.[0]?.toUpperCase() || null;
  const descriptionParts = String(alert.descricao || '').split('·').map((part) => part.trim()).filter(Boolean);
  const localFromDescription = descriptionParts.length > 1 ? descriptionParts[1] : descriptionParts[0];

  return {
    ...alert,
    sensor,
    sensorId,
    local: sensor?.local || localFromDescription || null,
    regiao: sensor?.regiao || null,
    temperatura: sensor?.temperatura,
    umidade: sensor?.umidade,
    bateria: sensor?.bateria,
  };
}

export function getAlertSearchText(alert) {
  return [alert.titulo, alert.descricao, alert.tipo, alert.sensorId, alert.local, alert.regiao]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
}

export function getAlertStatus(alert) {
  return alert.naoLido ? 'Não lido' : 'Lido';
}

export function parseAlertMinutes(value) {
  const text = String(value || '').toLocaleLowerCase('pt-BR');
  const match = text.match(/(\d+)\s*(min|h|dia)/u);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1]);
  if (match[2] === 'h') return amount * 60;
  if (match[2] === 'dia') return amount * 1440;
  return amount;
}

export function formatAlertValue(value, suffix = '') {
  if (!Number.isFinite(Number(value))) return 'Não disponível';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: suffix === '°C' ? 1 : 0, maximumFractionDigits: suffix === '°C' ? 1 : 0 })}${suffix}`;
}

