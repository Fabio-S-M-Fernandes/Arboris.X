const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireAuthorizedSupabaseSession, requireSupabaseIdentity } = require('../middleware/supabaseSession');
const authorizationService = require('../services/session-authorization.service');

const router = Router();
const limiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  handler(request, response) {
    console.warn('[auth-rate-limit]', JSON.stringify({ method: request.method, path: request.path, status: 429 }));
    response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } });
  },
});

// Reject bursts before making a remote Supabase getUser call.
router.use(limiter(120));
router.use(requireSupabaseIdentity);
router.use((request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
router.get('/me', requireAuthorizedSupabaseSession, (request, response) => {
  response.json({
    user: { id: request.supabaseUser.id, email: request.supabaseUser.email,
      userMetadata: request.supabaseUser.user_metadata || {},
      googleLinked: request.supabaseUser.identities?.some((identity) => identity.provider === 'google') || false },
    authorizedAt: request.supabaseSession.authorizedAt,
  });
});
router.post('/challenge', limiter(10), async (request, response, next) => {
  try { response.json(await authorizationService.begin({ user: request.supabaseUser, sessionId: request.supabaseSession.sessionId })); }
  catch (error) { next(error); }
});
router.post('/verify', limiter(20), async (request, response, next) => {
  try {
    response.json(await authorizationService.verify({
      userId: request.supabaseUser.id,
      sessionId: request.supabaseSession.sessionId,
      challengeId: request.body?.challengeId,
      code: request.body?.code,
    }));
  } catch (error) { next(error); }
});
router.post('/resend', limiter(10), async (request, response, next) => {
  try {
    response.json(await authorizationService.resend({
      user: request.supabaseUser,
      sessionId: request.supabaseSession.sessionId,
      challengeId: request.body?.challengeId,
    }));
  } catch (error) { next(error); }
});
router.post('/logout', limiter(30), async (request, response, next) => {
  try {
    await authorizationService.revoke({ userId: request.supabaseUser.id, sessionId: request.supabaseSession.sessionId });
    response.json({ message: 'Sessão encerrada.' });
  } catch (error) { next(error); }
});

module.exports = router;
