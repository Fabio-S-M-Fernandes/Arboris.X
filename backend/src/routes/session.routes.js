const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { FRONTEND_URLS, RATE_LIMIT_STORAGE, TRUSTED_DEVICE_DAYS, TRUSTED_DEVICE_ENABLED } = require('../config');
const PostgresRateLimitStore = require('../store/postgresRateLimitStore');
const { requireAuthorizedSupabaseSession, requireSupabaseIdentity } = require('../middleware/supabaseSession');
const authorizationService = require('../services/session-authorization.service');
const consentService = require('../services/account-consent.service');
const trustedDeviceService = require('../services/trusted-device.service');
const emailService = require('../services/email.service');
const HttpError = require('../utils/httpError');

const router = Router();
const trustedOrigin = (request) => FRONTEND_URLS.includes(request.get('Origin'));
const limiter = (name, limit, scope = 'user') => rateLimit({
  ...(RATE_LIMIT_STORAGE === 'postgres' ? { store: new PostgresRateLimitStore({ limiter: `session:${name}` }) } : {}),
  windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  ...(scope === 'ip' ? {} : { keyGenerator: (request) => scope === 'session'
    ? `${request.supabaseUser.id}:${request.supabaseSession.sessionId}` : request.supabaseUser.id }),
  handler(request, response) {
    const remainingSeconds = Math.max(1, Math.ceil((request.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || 900);
    response.set('Retry-After', String(remainingSeconds));
    console.warn('[auth-rate-limit]', JSON.stringify({ method: request.method, path: request.path, status: 429 }));
    response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } });
  },
});

// Reject bursts before making a remote Supabase getUser call.
router.use(limiter('ip-preauth', 600, 'ip'));
router.use((request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
router.use(requireSupabaseIdentity);
router.use(limiter('session', 120, 'session'));
router.get('/consent', async (request, response, next) => {
  try { response.json(await consentService.status(request.supabaseUser.id)); }
  catch (error) { next(error); }
});
router.post('/consent', limiter('consent', 10), async (request, response, next) => {
  try {
    if (request.body?.termsAccepted !== true || request.body?.privacyAccepted !== true) {
      throw new HttpError(422, 'Confirme os Termos de Uso e a Política de Privacidade.', undefined, 'CONSENT_REQUIRED');
    }
    await consentService.accept(request.supabaseUser.id, request.body?.optionalCookiesAccepted === true);
    response.json({ accepted: true });
  } catch (error) { next(error); }
});
router.delete('/consent', limiter('consent-decline', 5), async (request, response, next) => {
  try {
    await consentService.decline(request.supabaseUser.id);
    response.json({ deleted: true });
  } catch (error) { next(error); }
});
router.use((request, response, next) => {
  if (request.path === '/logout') return next();
  return consentService.requireAccepted(request.supabaseUser.id).then(() => next(), next);
});
router.get('/me', requireAuthorizedSupabaseSession, (request, response) => {
  response.json({
    user: { id: request.supabaseUser.id, email: request.supabaseUser.email,
      userMetadata: {
        full_name: String(request.supabaseUser.user_metadata?.full_name || '').slice(0, 120),
        name: String(request.supabaseUser.user_metadata?.name || '').slice(0, 120),
      },
      googleLinked: request.supabaseUser.identities?.some((identity) => identity.provider === 'google') || false },
    authorizedAt: request.supabaseSession.authorizedAt,
  });
});
router.post('/contact', limiter('contact', 5), requireAuthorizedSupabaseSession, async (request, response, next) => {
  try {
    if (!(request.supabaseUser.email_confirmed_at || request.supabaseUser.confirmed_at)) {
      throw new HttpError(403, 'Confirme seu e-mail antes de enviar.', undefined, 'EMAIL_CONFIRMATION_REQUIRED');
    }
    await emailService.sendContactMessage(request.body || {}, request.supabaseUser.email);
    response.status(202).json({ message: 'Mensagem enviada com sucesso.' });
  } catch (error) { next(error); }
});
router.post('/challenge', limiter('challenge', 10), async (request, response, next) => {
  try {
    authorizationService.assertEligible(request.supabaseUser);
    const cookiePreference = await consentService.status(request.supabaseUser.id);
    if (TRUSTED_DEVICE_ENABLED && trustedOrigin(request) && cookiePreference.optionalCookiesAccepted) {
      const trust = await trustedDeviceService.tryAuthorize({
        userId: request.supabaseUser.id,
        sessionId: request.supabaseSession.sessionId,
        token: trustedDeviceService.readToken(request),
      });
      if (trust) {
        trustedDeviceService.setCookie(response, trust.token, trust.expiresAt);
        if (trust.newlyAuthorized && request.supabaseUser.email) {
          void emailService.sendNewAccessAlert({
            email: request.supabaseUser.email,
            name: request.supabaseUser.user_metadata?.full_name || request.supabaseUser.user_metadata?.name || '',
            accessedAt: new Date().toISOString(),
          }).catch((error) => {
            const code = /^[A-Z0-9_]{1,64}$/.test(String(error.code || '')) ? error.code : 'UNKNOWN';
            console.warn('[security-alert]', JSON.stringify({ event: 'delivery_failed', code }));
          });
        }
        response.json({ authorized: true, trustedDevice: true });
        return;
      }
    }
    const challenge = await authorizationService.begin({ user: request.supabaseUser, sessionId: request.supabaseSession.sessionId });
    response.json({ ...challenge, trustedDeviceAvailable: TRUSTED_DEVICE_ENABLED && trustedOrigin(request) && cookiePreference.optionalCookiesAccepted, trustedDeviceDays: TRUSTED_DEVICE_DAYS });
  }
  catch (error) { next(error); }
});
router.post('/verify', limiter('verify', 20), async (request, response, next) => {
  try {
    const verified = await authorizationService.verify({
      userId: request.supabaseUser.id,
      user: request.supabaseUser,
      sessionId: request.supabaseSession.sessionId,
      challengeId: request.body?.challengeId,
      code: request.body?.code,
    });
    let trustedDeviceRegistered = false;
    if (verified.authorized && request.body?.trustDevice === true
      && TRUSTED_DEVICE_ENABLED && trustedOrigin(request)
      && (await consentService.status(request.supabaseUser.id)).optionalCookiesAccepted) {
      try {
        const trust = await trustedDeviceService.register({
          userId: request.supabaseUser.id, sessionId: request.supabaseSession.sessionId,
        });
        trustedDeviceService.setCookie(response, trust.token, trust.expiresAt);
        trustedDeviceRegistered = true;
      } catch (error) {
        const code = /^[A-Z0-9_]{1,64}$/.test(String(error.code || '')) ? error.code : 'UNKNOWN';
        console.warn('[trusted-device]', JSON.stringify({ event: 'registration_failed', code }));
      }
    }
    response.json({ ...verified, trustedDeviceRegistered });
  } catch (error) { next(error); }
});
router.post('/resend', limiter('resend', 10), async (request, response, next) => {
  try {
    response.json(await authorizationService.resend({
      user: request.supabaseUser,
      sessionId: request.supabaseSession.sessionId,
      challengeId: request.body?.challengeId,
    }));
  } catch (error) { next(error); }
});
router.post('/logout', limiter('logout', 30), async (request, response, next) => {
  try {
    await authorizationService.revoke({ userId: request.supabaseUser.id, sessionId: request.supabaseSession.sessionId });
    response.json({ message: 'Sessão encerrada.' });
  } catch (error) { next(error); }
});

router.get('/trusted-devices', requireAuthorizedSupabaseSession, async (request, response, next) => {
  try {
    response.json({ available: TRUSTED_DEVICE_ENABLED, devices: TRUSTED_DEVICE_ENABLED
      ? await trustedDeviceService.list({ userId: request.supabaseUser.id }) : [] });
  } catch (error) { next(error); }
});

router.delete('/trusted-devices/:id', limiter('device-revoke', 20), requireAuthorizedSupabaseSession, async (request, response, next) => {
  try {
    if (!TRUSTED_DEVICE_ENABLED) throw new HttpError(404, 'Recurso indisponível.');
    if (!trustedOrigin(request)) throw new HttpError(403, 'Origem não permitida.');
    const current = await trustedDeviceService.revoke({
      userId: request.supabaseUser.id,
      deviceId: request.params.id,
      token: trustedDeviceService.readToken(request),
    });
    if (current) trustedDeviceService.clearCookie(response);
    response.json({ revoked: true });
  } catch (error) { next(error); }
});

module.exports = router;
