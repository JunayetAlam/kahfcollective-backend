import express from 'express';
import auth from '../../middlewares/auth';
import { parseBody } from '../../middlewares/parseBody';
import { upload } from '../../middlewares/upload';
import validateRequest from '../../middlewares/validateRequest';
import { ContentControllers } from './Content.controller';
import { ContentValidation } from './Content.validation';

const router = express.Router();

// Create content
router.post(
  '/',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'content', maxCount: 1 },
  ]),
  parseBody,
  validateRequest.body(ContentValidation.createContent),
  ContentControllers.createContent,
);

// Get content by ID
router.get('/:id', auth('ANY'), ContentControllers.getContentById);

// Get all contents
router.get('/', auth('ANY'), ContentControllers.getAllContents);

// Update content
router.patch(
  '/:id',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'content', maxCount: 1 },
  ]),
  parseBody,
  validateRequest.body(ContentValidation.updateContent),
  ContentControllers.updateContent,
);

// Delete content
router.delete(
  '/:id',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  ContentControllers.deleteContent,
);

export const ContentRouters = router;
