import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SemesterService } from './semester.service';

const createSemester = catchAsync(async (req, res) => {
  const result = await SemesterService.createSemester(
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Semester created successfully',
    data: result,
  });
});

const updateSemester = catchAsync(async (req, res) => {
  const result = await SemesterService.updateSemester(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Semester updated successfully',
    data: result,
  });
});

const changeSemesterIndex = catchAsync(async (req, res) => {
  const result = await SemesterService.changeSemesterIndex(
    req.params.id,
    req.body.newIndex,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Semester index updated successfully',
    data: result,
  });
});

const toggleDeleteSemester = catchAsync(async (req, res) => {
  const result = await SemesterService.toggleDeleteSemester(
    req.params.id,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Semester delete status updated successfully',
    data: result,
  });
});

const getSemestersByCourse = catchAsync(async (req, res) => {
  const result = await SemesterService.getSemestersByCourse(
    req.params.courseId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Semesters retrieved successfully',
    data: result,
  });
});

export const SemesterController = {
  createSemester,
  updateSemester,
  changeSemesterIndex,
  toggleDeleteSemester,
  getSemestersByCourse,
};
