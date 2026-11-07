const { readDatabase } = require('../store/jsonStore');

const list = () => readDatabase().sensores;
const findById = (id) => list().find((sensor) => sensor.id.toLowerCase() === id.toLowerCase());

module.exports = { findById, list };
