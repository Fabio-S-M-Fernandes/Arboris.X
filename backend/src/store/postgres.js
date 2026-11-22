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
  if (!pool) {
    pool = new Pool({
      ...parse(DATABASE_URL),
      ssl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
      query_timeout: 12_000,
    });
    pool.on('error', (error) => {
      const code = /^[A-Z0-9]{5}$/.test(String(error.code || '')) ? error.code : 'UNKNOWN';
      console.error('[postgres-pool]', JSON.stringify({ event: 'idle_client_error', code }));
    });
  }
  return pool;
};

const closePool = async () => {
  if (!pool) return;
  const currentPool = pool;
  pool = undefined;
  await currentPool.end();
};

module.exports = { getPool, closePool };
