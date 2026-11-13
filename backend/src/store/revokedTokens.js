const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { REVOCATION_FILE } = require('../config');

const digest = (token) => createHash('sha256').update(token).digest('hex');
const read = () => {
  try {
    const entries = JSON.parse(fs.readFileSync(REVOCATION_FILE, 'utf8'));
    if (!entries || Array.isArray(entries) || typeof entries !== 'object') throw new Error('Registro de revoga??o inv?lido.');
    return entries;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error; // Falha fechada se o registro n?o puder ser lido.
  }
};
const isRevoked = (token) => (read()[digest(token)] || 0) > Date.now() / 1000;
const revoke = (token, expiresAt) => {
  const entries = Object.fromEntries(Object.entries(read()).filter(([, exp]) => exp > Date.now() / 1000));
  entries[digest(token)] = expiresAt;
  fs.mkdirSync(path.dirname(REVOCATION_FILE), { recursive: true });
  const temporary = `${REVOCATION_FILE}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(entries), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, REVOCATION_FILE);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
};
module.exports = { isRevoked, revoke };
