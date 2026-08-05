import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ChapterController } from './chapter.controller';
import { ChapterValidation } from './chapter.validation';

const router = express.Router();

router.post(
  '/',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(ChapterValidation.createChapter),
  ChapterController.createChapter,
);

router.get(
  '/semester/:semesterId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  ChapterController.getChaptersBySemester,
);

router.patch(
  '/:id',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(ChapterValidation.updateChapter),
  ChapterController.updateChapter,
);

router.patch(
  '/:id/change-index',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(ChapterValidation.changeIndex),
  ChapterController.changeChapterIndex,
);

router.patch(
  '/:id/move',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(ChapterValidation.moveChapter),
  ChapterController.moveChapter,
);

router.patch(
  '/:id/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  ChapterController.toggleDeleteChapter,
);

export const ChapterRouters = router;
