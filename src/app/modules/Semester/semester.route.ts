import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SemesterController } from './semester.controller';
import { SemesterValidation } from './semester.validation';

const router = express.Router();

router.post(
  '/',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(SemesterValidation.createSemester),
  SemesterController.createSemester,
);

router.get(
  '/course/:courseId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  SemesterController.getSemestersByCourse,
);

router.patch(
  '/:id',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(SemesterValidation.updateSemester),
  SemesterController.updateSemester,
);

router.patch(
  '/:id/change-index',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(SemesterValidation.changeIndex),
  SemesterController.changeSemesterIndex,
);

router.patch(
  '/:id/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  SemesterController.toggleDeleteSemester,
);

export const SemesterRouters = router;
