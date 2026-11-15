const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { GOOGLE_CLIENT_ID } = require('../config');
const {
  cancelChallenge, getMe, googleLogin, googleNonce, linkGoogle, login, logout, register, resendCode, verifyCode,
} = require('../controllers/auth.controller');

const router = Router();
// Limite global por IP antes do bcrypt; /me tem orçamento separado.
const limiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  handler(request, response) {
    console.warn('[auth-rate-limit]', JSON.stringify({ method: request.method, path: request.path, status: 429 }));
    response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } });
  },
});
router.use((request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
router.post('/register', limiter(5), register);
router.post('/login', limiter(12), login);
router.post('/verify', limiter(30), verifyCode);
router.post('/resend', limiter(10), resendCode);
router.post('/cancel', limiter(20), cancelChallenge);
router.post('/google/nonce', limiter(10), googleNonce);
router.get('/google/client-id', limiter(30), (request, response) => response.json({ clientId: GOOGLE_CLIENT_ID }));
router.post('/google', limiter(12), googleLogin);
router.post('/google/link', limiter(10), requireAuth, linkGoogle);
router.get('/me', limiter(180), requireAuth, getMe);
router.post('/logout', limiter(30), requireAuth, logout);

module.exports = router;
