const sensorRepository = require('../repositories/sensor.repository');
const HttpError = require('../utils/httpError');

const filter = (query) => sensorRepository.list().filter((sensor) => {
  const matchesRegion = query.regiao === 'Todas as regiões' || sensor.regiao === query.regiao;
  const matchesStatus = !query.status || query.status === 'Todos' || sensor.estado === query.status;
  const searchable = `${sensor.id} ${sensor.local} ${sensor.regiao}`.toLocaleLowerCase('pt-BR');
  return matchesRegion && matchesStatus && (!query.busca || searchable.includes(query.busca.toLocaleLowerCase('pt-BR')));
});

const list = (query, pagination) => {
  const data = filter(query);
  const start = (pagination.pagina - 1) * pagination.limite;
  return {
    data: data.slice(start, start + pagination.limite),
    meta: { total: data.length, ...pagination, paginas: Math.ceil(data.length / pagination.limite) },
  };
};

const getById = (id) => {
  const sensor = sensorRepository.findById(id);
  if (!sensor) throw new HttpError(404, 'Sensor não encontrado.');
  return sensor;
};

const listFiltered = filter;
module.exports = { getById, list, listFiltered };
