import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { Request } from 'express';
import { QuizAnswerService } from './quiz_answer.service';

// Answer a quiz
const ansQuiz = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const payload = req.body;

  const result = await QuizAnswerService.ansQuiz(userId, payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Quiz answered successfully',
    data: result,
  });
});

// Lock all quizzes for a content
const lockQuiz = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const { contentId } = req.params;

  const result = await QuizAnswerService.LockQuiz(userId, contentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz locked successfully',
    data: result,
  });
});

// Get result of all quizzes for a content
const getQuizResult = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const { contentId } = req.params;

  const result = await QuizAnswerService.getResultOfAQuizContents(userId, contentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz result fetched successfully',
    data: result,
  });
});

// Get a single quiz with user's answer
const getSingleQuiz = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const { quizId } = req.params;

  const result = await QuizAnswerService.getSingleQuizWithUserAnswer(userId, quizId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Single quiz fetched successfully',
    data: result,
  });
});

export const QuizAnswerControllers = {
  ansQuiz,
  lockQuiz,
  getQuizResult,
  getSingleQuiz,
};
