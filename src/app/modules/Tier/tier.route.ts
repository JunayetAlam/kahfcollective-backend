import express from 'express';
import auth from '../../middlewares/auth';
import { tierController } from './tier.controller';
import validateRequest from '../../middlewares/validateRequest';
import { tierValidation } from './tier.validation';

const router = express.Router();

router.post(
  '/',
  auth('SUPERADMIN'),
  validateRequest.body(tierValidation.createTier),
  tierController.createTier
);

router.get('/', tierController.getAllTiers);
router.get('/admin', auth('SUPERADMIN'), tierController.getAllTiers);

router.get('/:id', tierController.getTierById);
router.get('/admin/:id', auth('SUPERADMIN'), tierController.getTierById);

router.patch(
  '/toggle-tier',
  auth('SUPERADMIN'),
  validateRequest.body(tierValidation.toggleAssignTier),
  tierController.toggleAssignTier
);

router.patch(
  '/:id',
  auth('SUPERADMIN'),
  validateRequest.body(tierValidation.updateTier),
  tierController.updateTier
);


// toggle delete
router.patch(
  '/:id/toggle-delete',
  auth('SUPERADMIN'),
  tierController.toggleDeleteTier
);




export const TierRouters = router;
