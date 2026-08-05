import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsValidation } from './analytics.validation';

const router = express.Router();

router.post(
  '/content-progress',
  auth('USER', 'INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(AnalyticsValidation.markContentProgress),
  AnalyticsController.markContentProgress,
);

router.get(
  '/content-progress/course/:courseId',
  auth('USER', 'INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.getCourseCompletedContentIds,
);

router.get(
  '/content-progress/:contentId',
  auth('USER', 'INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.getContentProgress,
);

router.get('/me', auth('USER', 'INSTRUCTOR', 'SUPERADMIN'), AnalyticsController.getMySummary);

router.get(
  '/me/courses/:courseId',
  auth('USER', 'INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.getMyCourseDetail,
);

router.get(
  '/students/:userId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.getStudentSummary,
);

router.get(
  '/students/:userId/courses/:courseId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.getStudentCourseDetail,
);

router.get(
  '/courses/:courseId/leaderboard',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.getCourseLeaderboard,
);

router.get(
  '/compare',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.compareStudents,
);

router.get(
  '/subject-compare',
  auth('USER', 'INSTRUCTOR', 'SUPERADMIN'),
  AnalyticsController.compareSubjects,
);

router.post(
  '/backfill',
  auth('SUPERADMIN'),
  AnalyticsController.backfillStats,
);

export const AnalyticsRouters = router;
