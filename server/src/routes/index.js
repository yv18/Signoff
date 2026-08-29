import { Router } from 'express';
import authRoutes from './auth.routes.js';
import signatureRoutes from './signature.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true, at: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/signatures', signatureRoutes);

export default router;
