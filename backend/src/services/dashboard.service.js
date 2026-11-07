const dashboardRepository = require('../repositories/dashboard.repository');
const sensorService = require('./sensor.service');
const HttpError = require('../utils/httpError');

const round = (value, decimals = 1) => Number(value.toFixed(decimals));

const getSummary = (query) => {
  const summary = dashboardRepository.getSummary();
  if (query.regiao === 'Todas as regiões') return { ...summary, regiao: query.regiao, atualizadoEm: new Date().toISOString() };
  const sensors = sensorService.listFiltered(query);
  const temperature = sensors.reduce((sum, sensor) => sum + sensor.temperatura, 0) / Math.max(sensors.length, 1);
  const humidity = sensors.reduce((sum, sensor) => sum + sensor.umidade, 0) / Math.max(sensors.length, 1);
  return { temperaturaAtual: round(temperature), umidadeAr: Math.round(humidity), sensoresAtivos: sensors.filter((sensor) => sensor.estado === 'Estável').length, reducaoCalorPct: summary.reducaoCalorPct, regiao: query.regiao, atualizadoEm: new Date().toISOString() };
};

const getTrends = ({ periodo, medida, regiao }) => {
  const data = dashboardRepository.getTrends()[periodo];
  if (!data) throw new HttpError(400, 'Período inválido. Use 24h, 7d ou 30d.');
  return { periodo, medida, regiao, rotulo: data.rotulo, horarios: data.horarios, valores: data[medida] };
};
const getHeatMap = (regiao) => {
  const zones = dashboardRepository.listHeatZones();
  return { data: regiao === 'Todas as regiões' ? zones : zones.filter((zone) => zone.regiao === regiao) };
};
module.exports = { getHeatMap, getSummary, getTrends };
