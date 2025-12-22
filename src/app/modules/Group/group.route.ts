import express from 'express';
import auth from '../../middlewares/auth';
import { groupController } from './group.controller';
import validateRequest from '../../middlewares/validateRequest';
import { groupValidation } from './group.validation';

const router = express.Router();

router.post(
  '/',
  auth('SUPERADMIN'),
  validateRequest.body(groupValidation.createGroup),
  groupController.createGroup
);

router.get('/', groupController.getAllGroups);
router.get('/admin', auth('SUPERADMIN'), groupController.getAllGroups);

router.get('/:id', groupController.getGroupById);
router.get('/admin/:id', auth('SUPERADMIN'), groupController.getGroupById);

router.patch(
  '/toggle-group',
  auth('SUPERADMIN'),
  validateRequest.body(groupValidation.toggleAssignGroup),
  groupController.toggleAssignGroup
);

router.patch(
  '/:id',
  auth('SUPERADMIN'),
  validateRequest.body(groupValidation.updateGroup),
  groupController.updateGroup
);


// toggle delete
router.patch(
  '/:id/toggle-delete',
  auth('SUPERADMIN'),
  groupController.toggleDeleteGroup
);




export const GroupRouters = router;
