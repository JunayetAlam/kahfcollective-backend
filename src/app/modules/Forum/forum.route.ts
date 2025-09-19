import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ForumController } from './forum.controller';
import { forumValidation } from './forum.validation';

const router = express.Router();

router.post(
  '/circle',
  auth('SUPERADMIN', "INSTRUCTOR"),
  validateRequest.body(forumValidation.createCircleForum),
  ForumController.createCircleForum
);

router.post(
  '/location',
  auth('SUPERADMIN', "INSTRUCTOR"),
  validateRequest.body(forumValidation.createLocationForum),
  ForumController.createLocationForum
);

router.get('/', auth("ANY"), ForumController.getAllForums);
router.get('/:id', auth("ANY"), ForumController.getSingleForum);

router.patch(
  '/circle/:forumId',
  auth('SUPERADMIN', "INSTRUCTOR"),
  validateRequest.body(forumValidation.updateCircleForum),
  ForumController.updateCircleForum
);

router.patch(
  '/location/:forumId',
  auth('SUPERADMIN', "INSTRUCTOR"),
  validateRequest.body(forumValidation.updateLocationForum),
  ForumController.updateLocationForum
);

router.delete(
  '/:forumId',
  auth('SUPERADMIN'),
  ForumController.deleteForum
);

export const ForumRouters = router;
