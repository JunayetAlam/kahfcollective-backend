import { UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsService } from './analytics.service';

const markContentProgress = catchAsync(async (req, res) => {
  const result = await AnalyticsService.markContentProgress(
    req.user.id,
    req.body.courseContentId,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content marked as completed',
    data: result,
  });
});

const getContentProgress = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getContentProgress(
    req.user.id,
    req.params.contentId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content progress retrieved',
    data: result,
  });
});

const getCourseCompletedContentIds = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getCourseCompletedContentIds(
    req.user.id,
    req.params.courseId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course content progress retrieved',
    data: result,
  });
});

const getMySummary = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getStudentSummary(
    req.user.id,
    req.user.id,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Performance summary retrieved',
    data: result,
  });
});

const getMyCourseDetail = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getStudentCourseDetail(
    req.user.id,
    req.params.courseId,
    req.user.id,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course performance retrieved',
    data: result,
  });
});

const getStudentSummary = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getStudentSummary(
    req.params.userId,
    req.user.id,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Student performance retrieved',
    data: result,
  });
});

const getStudentCourseDetail = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getStudentCourseDetail(
    req.params.userId,
    req.params.courseId,
    req.user.id,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Student course performance retrieved',
    data: result,
  });
});

const getCourseLeaderboard = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getCourseLeaderboard(
    req.params.courseId,
    req.user.id,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course leaderboard retrieved',
    data: result,
  });
});

const compareStudents = catchAsync(async (req, res) => {
  const { userA, userB, courseId, semesterId, chapterId } = req.query;
  const result = await AnalyticsService.compareStudents(
    String(userA),
    String(userB),
    req.user.id,
    req.user.role as UserRoleEnum,
    {
      courseId: courseId ? String(courseId) : undefined,
      semesterId: semesterId ? String(semesterId) : undefined,
      chapterId: chapterId ? String(chapterId) : undefined,
    },
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Student comparison retrieved',
    data: result,
  });
});

const compareSubjects = catchAsync(async (req, res) => {
  const { chapterA, chapterB, userId } = req.query;
  const targetUserId =
    req.user.role === UserRoleEnum.USER
      ? req.user.id
      : userId
        ? String(userId)
        : req.user.id;

  const result = await AnalyticsService.compareSubjects(
    targetUserId,
    String(chapterA),
    String(chapterB),
    req.user.id,
    req.user.role as UserRoleEnum,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Subject comparison retrieved',
    data: result,
  });
});

const backfillStats = catchAsync(async (req, res) => {
  const result = await AnalyticsService.backfillAllStats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Stats backfill completed',
    data: result,
  });
});

export const AnalyticsController = {
  markContentProgress,
  getContentProgress,
  getCourseCompletedContentIds,
  getMySummary,
  getMyCourseDetail,
  getStudentSummary,
  getStudentCourseDetail,
  getCourseLeaderboard,
  compareStudents,
  compareSubjects,
  backfillStats,
};
