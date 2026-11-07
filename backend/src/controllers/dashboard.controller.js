const alertService = require('../services/alert.service');
const dashboardService = require('../services/dashboard.service');
const sensorService = require('../services/sensor.service');
const HttpError = require('../utils/httpError');
const { parseDashboardQuery, parseId, parsePagination, parseTrendQuery } = require('../validators/query.validator');


const getSummary = (request, response) => response.json(dashboardService.getSummary(parseDashboardQuery(request.query)));
const getTrends = (request, response) => response.json(dashboardService.getTrends(parseTrendQuery(request.query)));
const getSensors = (request, response) => response.json(sensorService.list(parseDashboardQuery(request.query), parsePagination(request.query)));
const getSensorById = (request, response) => response.json(sensorService.getById(parseId(request.params.id, 'id')));

const getAlerts = (request, response) => {
  const apenasNaoLidos = request.query.apenasNaoLidos;
  if (apenasNaoLidos !== undefined && !['true', 'false'].includes(apenasNaoLidos)) throw new HttpError(400, 'Parâmetro apenasNaoLidos inválido.');
  response.json(alertService.list({ apenasNaoLidos: apenasNaoLidos === 'true' }));
};
const markAlertAsRead = (request, response) => response.json(alertService.markAsRead(parseId(request.params.id, 'id')));
const markAllAlertsAsRead = (_request, response) => response.json(alertService.markAllAsRead());
const getHeatMap = (request, response) => response.json(dashboardService.getHeatMap(parseDashboardQuery(request.query).regiao));

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
