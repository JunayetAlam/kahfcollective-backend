import express from 'express';
import auth from '../../middlewares/auth';
import { tierController } from './tier.controller';
import validateRequest from '../../middlewares/validateRequest';
import { tierValidation } from './tier.validation';
import { upload } from '../../utils/fileUploader';
import { parseBody } from '../../middlewares/parseBody';

const router = express.Router();

router.post(
  '/',
  auth('SUPERADMIN'),
  upload.single('file'),
  parseBody,
  validateRequest.body(tierValidation.createTier),
  tierController.createTier
);

router.get('/', tierController.getAllTiers);
router.get('/admin', auth('SUPERADMIN'), tierController.getAllTiers);

router.get('/:id', tierController.getTierById);
router.get('/admin/:id', auth('SUPERADMIN'), tierController.getTierById);

router.patch(
  '/:id',
  auth('SUPERADMIN'),
  upload.single('file'),
  parseBody,
  validateRequest.body(tierValidation.updateTier),
  tierController.updateTier
);

// toggle delete
router.patch(
  '/:id/toggle-delete',
  auth('SUPERADMIN'),
  tierController.toggleDeleteTier
);

// toggle hide
router.patch(
  '/:id/toggle-hide',
  auth('SUPERADMIN'),
  tierController.toggleHideTier
);

// toggle popular
router.patch(
  '/:id/toggle-popular',
  auth('SUPERADMIN'),
  tierController.togglePopularTier
);

export const TierRouters = router;
