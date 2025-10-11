import express from 'express';
import auth from '../../middlewares/auth';
import { QuizAnswerControllers } from './quiz_answer.controller';
import { parseBody } from '../../middlewares/parseBody';
import validateRequest from '../../middlewares/validateRequest';
import { quizAnswerValidation } from './quiz_answer.validation';

const router = express.Router();

// Answer a quiz
router.post(
  '',
  auth('USER'),
  parseBody,
  validateRequest.body(quizAnswerValidation.ansQuiz),
  QuizAnswerControllers.ansQuiz,
);
router.post(
  '/mark',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  QuizAnswerControllers.markQuizAnswer,
);

router.get(
  '/quiz-answers',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  QuizAnswerControllers.getAllQuizAnswers,
);

// Lock all quizzes for a content
router.post(
  '/lock/:contentId',
  auth('USER'),
  QuizAnswerControllers.lockQuiz,
);

// Get quiz result for a content
router.get(
  '/result/:contentId',
  auth('USER'),
  QuizAnswerControllers.getQuizResult,
);

// Get a single quiz with user's answer
router.get(
  '/:quizId',
  auth('USER'),
  QuizAnswerControllers.getSingleQuiz,
);


export const QuizAnswerRouters = router;
