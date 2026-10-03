const fs = require('node:fs');
const path = require('node:path');
const { DATA_FILE } = require('../config');
const { seed } = require('../data/seed');

const clone = (value) => JSON.parse(JSON.stringify(value));

const ensureDatabase = () => {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, `${JSON.stringify(seed(), null, 2)}\n`, 'utf8');
  }
};

const readDatabase = () => {
  ensureDatabase();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`Não foi possível ler a base local: ${error.message}`, { cause: error });
  }
};

const writeDatabase = (database) => {
  ensureDatabase();
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
};

const updateDatabase = (updater) => {
  const database = readDatabase();
  const result = updater(database);
  writeDatabase(database);
  return result;
};

module.exports = { clone, readDatabase, updateDatabase };
