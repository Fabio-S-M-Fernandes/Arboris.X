const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5174')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const JWT_SECRET = process.env.JWT_SECRET || 'arboris-x-dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.cwd(), process.env.DATA_FILE)
  : path.resolve(__dirname, '../data/db.json');

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'arboris-x-dev-secret-change-me') {
  throw new Error('JWT_SECRET precisa ser configurado em produção.');
}

module.exports = { DATA_FILE, FRONTEND_URLS, JWT_EXPIRES_IN, JWT_SECRET, PORT };
