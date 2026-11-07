const { readDatabase, updateDatabase } = require('../store/jsonStore');

const list = () => readDatabase().alertas;
const findById = (id) => list().find((alert) => alert.id === id);
const markAsRead = (id) => updateDatabase((database) => {
  const alert = database.alertas.find((item) => item.id === id);
  if (alert) alert.naoLido = false;
  return alert;
});
const markAllAsRead = () => updateDatabase((database) => {
  database.alertas.forEach((alert) => { alert.naoLido = false; });
  return database.alertas;
});

module.exports = { findById, list, markAllAsRead, markAsRead };
