const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const {
  cancelChallenge, getMe, googleLogin, googleNonce, linkGoogle, login, logout, register, resendCode, verifyCode,
} = require('../controllers/auth.controller');

const router = Router();

// Limite global por IP antes do bcrypt; /me tem or?amento separado.
const limiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } },
});
router.use((request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
router.post('/register', limiter(8), register);
router.post('/login', limiter(20), login);
router.post('/verify', limiter(30), verifyCode);
router.post('/resend', limiter(10), resendCode);
router.post('/cancel', limiter(20), cancelChallenge);
router.post('/google/nonce', limiter(10), googleNonce);
router.post('/google', limiter(12), googleLogin);
router.post('/google/link', limiter(10), requireAuth, linkGoogle);
router.get('/me', limiter(180), requireAuth, getMe);
router.post('/logout', requireAuth, logout);

module.exports = router;
