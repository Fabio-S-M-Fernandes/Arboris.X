const { readDatabase, updateDatabase } = require('../store/jsonStore');
const HttpError = require('../utils/httpError');

const round = (value, decimals = 1) => Number(value.toFixed(decimals));
const getRegion = (request) => request.query.regiao || 'Todas as regiões';

const filterSensors = (sensors, request) => {
  const region = getRegion(request);
  const status = request.query.status;
  const search = String(request.query.busca || '').trim().toLocaleLowerCase('pt-BR');
  return sensors.filter((sensor) => {
    const matchesRegion = region === 'Todas as regiões' || sensor.regiao === region;
    const matchesStatus = !status || status === 'Todos' || sensor.estado === status;
    const searchable = `${sensor.id} ${sensor.local} ${sensor.regiao}`.toLocaleLowerCase('pt-BR');
    return matchesRegion && matchesStatus && (!search || searchable.includes(search));
  });
};

const getSummary = (request, response) => {
  const database = readDatabase();
  const region = getRegion(request);
  if (region === 'Todas as regiões') {
    return response.json({ ...database.resumo, regiao: region, atualizadoEm: new Date().toISOString() });
  }

  const sensors = filterSensors(database.sensores, request);
  const temperature = sensors.reduce((sum, sensor) => sum + sensor.temperatura, 0) / Math.max(sensors.length, 1);
  const humidity = sensors.reduce((sum, sensor) => sum + sensor.umidade, 0) / Math.max(sensors.length, 1);
  return response.json({
    temperaturaAtual: round(temperature),
    umidadeAr: Math.round(humidity),
    sensoresAtivos: sensors.filter((sensor) => sensor.estado === 'Estável').length,
    reducaoCalorPct: database.resumo.reducaoCalorPct,
    regiao: region,
    atualizadoEm: new Date().toISOString(),
  });
};

const getTrends = (request, response) => {
  const database = readDatabase();
  const periodo = request.query.periodo || '24h';
  const medida = request.query.medida || 'temperatura';
  if (!database.tendencias[periodo]) throw new HttpError(400, 'Período inválido. Use 24h, 7d ou 30d.');
  if (!['temperatura', 'umidade'].includes(medida)) throw new HttpError(400, 'Medida inválida. Use temperatura ou umidade.');

  const data = database.tendencias[periodo];
  response.json({ periodo, medida, regiao: getRegion(request), rotulo: data.rotulo, horarios: data.horarios, valores: data[medida] });
};

const getSensors = (request, response) => {
  const data = filterSensors(readDatabase().sensores, request);
  const page = Math.max(Number.parseInt(request.query.pagina || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(request.query.limite || '50', 10), 1), 100);
  const start = (page - 1) * limit;
  response.json({ data: data.slice(start, start + limit), meta: { total: data.length, pagina: page, limite: limit, paginas: Math.ceil(data.length / limit) } });
};

const getSensorById = (request, response) => {
  const sensor = readDatabase().sensores.find((item) => item.id.toLowerCase() === request.params.id.toLowerCase());
  if (!sensor) throw new HttpError(404, 'Sensor não encontrado.');
  response.json(sensor);
};

const getAlerts = (request, response) => {
  const alertas = readDatabase().alertas;
  const apenasNaoLidos = request.query.apenasNaoLidos === 'true';
  response.json({ data: apenasNaoLidos ? alertas.filter((alerta) => alerta.naoLido) : alertas, naoLidos: alertas.filter((alerta) => alerta.naoLido).length });
};

const markAlertAsRead = (request, response) => {
  const updated = updateDatabase((database) => {
    const alert = database.alertas.find((item) => item.id === request.params.id);
    if (!alert) throw new HttpError(404, 'Alerta não encontrado.');
    alert.naoLido = false;
    return alert;
  });
  response.json(updated);
};

const markAllAlertsAsRead = (request, response) => {
  const result = updateDatabase((database) => {
    database.alertas.forEach((alert) => { alert.naoLido = false; });
    return database.alertas;
  });
  response.json({ data: result, message: 'Todos os alertas foram marcados como lidos.' });
};

const getHeatMap = (request, response) => {
  const zones = readDatabase().zonasCalor;
  const region = getRegion(request);
  response.json({ data: region === 'Todas as regiões' ? zones : zones.filter((zone) => zone.regiao === region) });
};

module.exports = {
  getAlerts,
  getHeatMap,
  getSensorById,
  getSensors,
  getSummary,
  getTrends,
  markAlertAsRead,
  markAllAlertsAsRead,
};
