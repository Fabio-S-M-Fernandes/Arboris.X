const HttpError = require('../utils/httpError');

const parseOptionalText = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length > 100) throw new HttpError(400, `Parâmetro ${name} inválido.`);
  return value.trim();
};

const parsePagination = (query) => {
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  const limite = query.limite === undefined ? 50 : Number(query.limite);
  if (!Number.isInteger(pagina) || pagina < 1) throw new HttpError(400, 'Parâmetro pagina inválido.');
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) throw new HttpError(400, 'Parâmetro limite inválido. Use um valor entre 1 e 100.');
  return { pagina, limite };
};

const parseDashboardQuery = (query) => ({
  regiao: parseOptionalText(query.regiao, 'regiao') || 'Todas as regiões',
  status: parseOptionalText(query.status, 'status'),
  busca: parseOptionalText(query.busca, 'busca'),
});

const parseTrendQuery = (query) => {
  const { regiao } = parseDashboardQuery(query);
  const periodo = query.periodo === undefined ? '24h' : parseOptionalText(query.periodo, 'periodo');
  const medida = query.medida === undefined ? 'temperatura' : parseOptionalText(query.medida, 'medida');
  if (!['24h', '7d', '30d'].includes(periodo)) throw new HttpError(400, 'Período inválido. Use 24h, 7d ou 30d.');
  if (!['temperatura', 'umidade'].includes(medida)) throw new HttpError(400, 'Medida inválida. Use temperatura ou umidade.');
  return { medida, periodo, regiao };
};

const parseId = (value, name = 'id') => {
  if (typeof value !== 'string' || !/^[\w-]+$/u.test(value)) throw new HttpError(400, `${name} inválido.`);
  return value;
};

module.exports = { parseDashboardQuery, parseId, parsePagination, parseTrendQuery };
