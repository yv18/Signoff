import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/signature.controller.js';
import * as upload from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { renderLimiter } from '../middleware/rateLimit.js';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Upload a PNG, JPG or WebP image.'), ok);
  }
});

router.get('/catalog', ctrl.catalog);

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', validate(ctrl.signatureSchema), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', validate(ctrl.signatureSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/:id/publish', renderLimiter, ctrl.publish);
router.post('/:id/asset/:kind', imageUpload.single('file'), upload.uploadAsset);
router.delete('/:id/asset/:kind', upload.clearAsset);

export default router;
