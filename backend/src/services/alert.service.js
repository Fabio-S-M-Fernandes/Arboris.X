const alertRepository = require('../repositories/alert.repository');
const HttpError = require('../utils/httpError');

const list = ({ apenasNaoLidos = false }) => {
  const alertas = alertRepository.list();
  return { data: apenasNaoLidos ? alertas.filter((alerta) => alerta.naoLido) : alertas, naoLidos: alertas.filter((alerta) => alerta.naoLido).length };
};

const markAsRead = (id) => {
  const alert = alertRepository.findById(id);
  if (!alert) throw new HttpError(404, 'Alerta não encontrado.');
  return alertRepository.markAsRead(id);
};

const markAllAsRead = () => ({ data: alertRepository.markAllAsRead(), message: 'Todos os alertas foram marcados como lidos.' });
module.exports = { list, markAllAsRead, markAsRead };
