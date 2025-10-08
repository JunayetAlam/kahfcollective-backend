import express from 'express';
import auth from '../../middlewares/auth';
import { parseBody } from '../../middlewares/parseBody';
import { upload } from '../../middlewares/upload';
import validateRequest from '../../middlewares/validateRequest';
import { CourseContentController } from './coursecontent.controller';
import { CoursecontentValidation } from './coursecontent.validation';

const router = express.Router();

// Create video content
router.post(
  '/video',
  upload.single('file'),
  parseBody,
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createVideoContent),
  CourseContentController.createVideoContent,
);

// Create question content
router.post(
  '/question',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createQuestionContent),
  CourseContentController.createQuestionContent,
);

// Create question content
router.patch(
  '/question',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.updateQuestionContent),
  CourseContentController.updateQuestionContent,
);

// router.patch(
//   '/question',
//   auth('INSTRUCTOR', 'SUPERADMIN'),
//   validateRequest.body(CoursecontentValidation.answerQuestionContent),
//   CourseContentController.answerQuestionContent,
// );

router.get(
  '/questions',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.answerQuestionContent),
  CourseContentController.answerQuestionContent,
);

router.get(
  '/questions/:id',
  auth('ANY'),
  CourseContentController.getSingleQuestion,
);

router.post(
  '/question/answer',
  auth('ANY'),
  validateRequest.body(CoursecontentValidation.answerQuestionContent),
  CourseContentController.answerQuestionContent,
);

router.get(
  '/question/answers',
  auth('SUPERADMIN', 'INSTRUCTOR'),
  CourseContentController.getQuestionAnswers,
);

router.put(
  '/question/answers',
  auth('SUPERADMIN', 'INSTRUCTOR'),
  validateRequest.body(CoursecontentValidation.updateAnswerStatus),
  CourseContentController.updateAnswerStatus,
);

router.put(
  '/video/:id',
  upload.single('file'),
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.updateVideoContent,
);

// Create quiz content
router.post(
  '/quiz',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createQuizContent),
  CourseContentController.createQuizContent,
);

// Update content
router.patch(
  '/:contentId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.updateContent),
  CourseContentController.updateContent,
);

// Toggle delete content
router.patch(
  '/:contentId/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.toggleDeleteContent,
);

// Change content index
router.patch(
  '/:contentId/change-index',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.changeIndex),
  CourseContentController.changeContentIndex,
);

// Get all contents for a specific course (for owners/superadmins)
router.get(
  '/course/:courseId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getAllContentForSpecificCourse,
);

// Get all contents for a specific course (for normal users)
router.get(
  '/course/:courseId/user',
  auth('ANY'),
  CourseContentController.getAllContentForSpecificCourseForUser,
);

// Get single content (for owners/superadmins)
router.get(
  '/:contentId/admin',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getSingleContent,
);

// Get single content (for normal users)
router.get(
  '/:contentId',
  auth('ANY'),
  CourseContentController.getSingleContentForUser,
);

// Quiz routes

// Create individual quiz
router.post(
  '/quiz/single',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.createQuiz),
  CourseContentController.createQuiz,
);

router.patch(
  '/quiz/:quizId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.updateQuiz),
  CourseContentController.updateQuiz,
);

router.patch(
  '/quiz/:quizId/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.toggleDeleteQuiz,
);

router.patch(
  '/quiz/:quizId/change-index',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(CoursecontentValidation.changeIndex),
  CourseContentController.changeQuizIndex,
);

router.get(
  '/:courseContentId/quizzes',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getAllQuizForSpecificCourseContent,
);

router.get(
  '/:courseContentId/quizzes/user',
  auth('ANY'),
  CourseContentController.getAllQuizForSpecificCourseContentForUser,
);

router.get(
  '/quiz/:quizId/admin',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  CourseContentController.getSingleQuiz,
);

router.get(
  '/quiz/:quizId',
  auth('ANY'),
  CourseContentController.getSingleQuizForUser,
);

export const CourseContentRouters = router;
