const crypto = require('node:crypto');
const { OTP_SECRET } = require('../config');
const userRepository = require('../repositories/user.repository');

const COOKIE_NAME = 'arboris_device';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

const parseCookie = (header, name) => {
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return ''; }
  }
  return '';
};

const digest = (value) => crypto.createHmac('sha256', OTP_SECRET).update(`arboris-device:${value}`).digest('hex');

const describeUserAgent = (userAgent) => {
  const ua = String(userAgent || '').slice(0, 512);
  let browser = 'Navegador não identificado';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Chrome\//i.test(ua) && !/Chromium\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  let operatingSystem = 'Sistema operacional não identificado';
  if (/Windows NT/i.test(ua)) operatingSystem = 'Windows';
  else if (/Android/i.test(ua)) operatingSystem = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) operatingSystem = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) operatingSystem = 'macOS';
  else if (/Linux/i.test(ua)) operatingSystem = 'Linux';

  let deviceType = 'Computador';
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) deviceType = 'Tablet';
  else if (/Mobile|iPhone|iPod|Android/i.test(ua)) deviceType = 'Celular';

  return { browser, operatingSystem, deviceType };
};

const cookieOptions = (production) => ({
  httpOnly: true,
  secure: production,
  sameSite: production ? 'none' : 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE,
});

const recognize = (user, request, now = new Date()) => {
  const production = process.env.NODE_ENV === 'production';
  const existingValue = parseCookie(request.headers.cookie, COOKIE_NAME);
  const validValue = /^[A-Za-z0-9_-]{40,64}$/.test(existingValue) ? existingValue : '';
  const knownDevice = validValue && (user.devices || []).some((device) => device.tokenHash === digest(validValue));
  const cookieValue = knownDevice ? validValue : crypto.randomBytes(32).toString('base64url');
  const metadata = describeUserAgent(request.headers['user-agent']);
  const timestamp = now.toISOString();
  const tokenHash = digest(cookieValue);
  const record = {
    tokenHash, firstSeenAt: timestamp, lastSeenAt: timestamp,
    ...metadata,
  };

  try {
    const result = userRepository.registerDevice(user.id, record);
    if (!result) return null;
    const saved = result.device;
    return {
      cookieValue,
      cookieName: COOKIE_NAME,
      cookieOptions: cookieOptions(production),
      isNew: result.isNew,
      event: {
        deviceType: saved.deviceType,
        browser: saved.browser,
        operatingSystem: saved.operatingSystem,
        approximateLocation: 'Localização não identificada',
        accessedAt: saved.firstSeenAt,
      },
    };
  } catch {
    return null;
  }
};

module.exports = { COOKIE_NAME, cookieOptions, describeUserAgent, parseCookie, recognize };
