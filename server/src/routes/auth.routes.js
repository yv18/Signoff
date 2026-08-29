import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Sign-up is two steps: request an emailed code, then verify it.
router.post('/register/start', otpLimiter, validate(ctrl.registerSchema), ctrl.registerStart);
router.post('/register/resend', otpLimiter, validate(ctrl.resendSchema), ctrl.registerResend);
router.post('/register/verify', authLimiter, validate(ctrl.verifySchema), ctrl.registerVerify);

router.post('/login', authLimiter, validate(ctrl.loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/logout-all', requireAuth, ctrl.logoutAll);
router.get('/me', requireAuth, ctrl.me);

export default router;
