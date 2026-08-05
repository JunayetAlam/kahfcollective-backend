import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ChapterService } from './chapter.service';

const createChapter = catchAsync(async (req, res) => {
  const result = await ChapterService.createChapter(
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Chapter created successfully',
    data: result,
  });
});

const updateChapter = catchAsync(async (req, res) => {
  const result = await ChapterService.updateChapter(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Chapter updated successfully',
    data: result,
  });
});

const changeChapterIndex = catchAsync(async (req, res) => {
  const result = await ChapterService.changeChapterIndex(
    req.params.id,
    req.body.newIndex,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Chapter index updated successfully',
    data: result,
  });
});

const moveChapter = catchAsync(async (req, res) => {
  const result = await ChapterService.moveChapter(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Chapter moved successfully',
    data: result,
  });
});

const toggleDeleteChapter = catchAsync(async (req, res) => {
  const result = await ChapterService.toggleDeleteChapter(
    req.params.id,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Chapter delete status updated successfully',
    data: result,
  });
});

const getChaptersBySemester = catchAsync(async (req, res) => {
  const result = await ChapterService.getChaptersBySemester(
    req.params.semesterId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Chapters retrieved successfully',
    data: result,
  });
});

export const ChapterController = {
  createChapter,
  updateChapter,
  changeChapterIndex,
  moveChapter,
  toggleDeleteChapter,
  getChaptersBySemester,
};
