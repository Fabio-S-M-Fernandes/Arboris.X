const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const { DATABASE_URL } = require('../config');

const ca = fs.readFileSync(path.resolve(__dirname, '../../certificates/prod-ca-2021.crt'), 'utf8');
const ssl = {
  ca,
  rejectUnauthorized: true,
  checkServerIdentity: tls.checkServerIdentity,
};

let pool;

const getPool = () => {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  pool ||= new Pool({
    ...parse(DATABASE_URL),
    ssl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
};

module.exports = { getPool };
