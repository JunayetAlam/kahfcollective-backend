import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { CourseContentController } from './coursecontent.controller';
import { CoursecontentValidation } from './coursecontent.validation';
import { parseBody } from '../../middlewares/parseBody';

const router = express.Router();

// Create video content
router.post(
  '/video',
  upload.single('file'),
  parseBody,
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createVideoContent),
  CourseContentController.createVideoContent
);
router.put(
  '/video/:id',
  upload.single('file'),
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.updateVideoContent
);

// Create quiz content
router.post(
  '/quiz',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createQuizContent),
  CourseContentController.createQuizContent
);

// Update content
router.patch(
  '/:contentId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.updateContent),
  CourseContentController.updateContent
);

// Toggle delete content
router.patch(
  '/:contentId/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.toggleDeleteContent
);

// Change content index
router.patch(
  '/:contentId/change-index',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.changeIndex),
  CourseContentController.changeContentIndex
);

// Get all contents for a specific course (for owners/superadmins)
router.get(
  '/course/:courseId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getAllContentForSpecificCourse
);

// Get all contents for a specific course (for normal users)
router.get(
  '/course/:courseId/user',
  auth('ANY'),
  CourseContentController.getAllContentForSpecificCourseForUser
);

// Get single content (for owners/superadmins)
router.get(
  '/:contentId/admin',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getSingleContent
);

// Get single content (for normal users)
router.get(
  '/:contentId',
  auth('ANY'),
  CourseContentController.getSingleContentForUser
);

// Quiz routes

// Create individual quiz
router.post(
  '/quiz/single',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createQuiz),
  CourseContentController.createQuiz
);

// Update quiz
router.patch(
  '/quiz/:quizId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.updateQuiz),
  CourseContentController.updateQuiz
);

// Toggle delete quiz
router.patch(
  '/quiz/:quizId/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.toggleDeleteQuiz
);

// Change quiz index
router.patch(
  '/quiz/:quizId/change-index',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.changeIndex),
  CourseContentController.changeQuizIndex
);

// Get all quizzes for specific course content (for owners/superadmins)
router.get(
  '/:courseContentId/quizzes',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getAllQuizForSpecificCourseContent
);

// Get all quizzes for specific course content (for normal users)
router.get(
  '/:courseContentId/quizzes/user',
  auth('ANY'),
  CourseContentController.getAllQuizForSpecificCourseContentForUser
);

// Get single quiz (for owners/superadmins)
router.get(
  '/quiz/:quizId/admin',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getSingleQuiz
);

// Get single quiz (for normal users)
router.get(
  '/quiz/:quizId',
  auth('ANY'),
  CourseContentController.getSingleQuizForUser
);

export const CourseContentRouters = router;