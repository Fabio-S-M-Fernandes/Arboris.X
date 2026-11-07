const { readDatabase } = require('../store/jsonStore');

const getSummary = () => readDatabase().resumo;
const getTrends = () => readDatabase().tendencias;
const listHeatZones = () => readDatabase().zonasCalor;

module.exports = { getSummary, getTrends, listHeatZones };
