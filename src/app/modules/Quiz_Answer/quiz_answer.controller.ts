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
const markQuizAnswer = catchAsync(async (req: Request, res) => {
  const payload = req.body;

  const result = await QuizAnswerService.markQuizAnswer(payload.quizAnswerId, payload.isRight);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Quiz answer marked successfully',
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
const getResultOfAQuizContentsInstructor = catchAsync(async (req: Request, res) => {
  const { contentId, userId } = req.query;

  const result = await QuizAnswerService.getResultOfAQuizContentsInstructor(userId as string, contentId as string);

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
// Get a single quiz with user's answer
const getAllQuizAnswers = catchAsync(async (req: Request, res) => {
  const result = await QuizAnswerService.getAllQuizAnswersGrouped(Number(req.query.page || 1), Number(req.query.limit || 10));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz result fetched successfully',
    ...result,
  });
});

export const QuizAnswerControllers = {
  ansQuiz,
  markQuizAnswer,
  lockQuiz,
  getQuizResult,
  getSingleQuiz,
  getAllQuizAnswers,
  getResultOfAQuizContentsInstructor
};
