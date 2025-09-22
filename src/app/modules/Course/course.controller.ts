import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CourseService } from './course.service';

const createCourse = catchAsync(async (req, res) => {
  const userId = req?.user?.id;
  const result = await CourseService.createCourse(req.body, userId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Course created successfully',
    data: result,
  });
});

const getAllCourses = catchAsync(async (req, res) => {
  const query = req.query as Record<string, unknown>;
  const role = req?.user?.role;
  const userId = req?.user?.id;
  const result = await CourseService.getAllCourses({ query, role, userId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Courses retrieved successfully',
    ...result,
  });
});

const getCourseById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const role = req?.user?.role;
  const userId = req?.user?.id;
  const result = await CourseService.getCourseById({ id, role, userId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course retrieved successfully',
    data: result,
  });
});

const updateCourse = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req?.user?.id;
  const role = req?.user?.role;
  const result = await CourseService.updateCourse(id, req.body, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course updated successfully',
    data: result,
  });
});

const toggleDeleteCourse = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req?.user?.id;
  const role = req?.user?.role;
  const result = await CourseService.toggleDeleteCourse(id, role, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course delete status toggled successfully',
    data: result,
  });
});

const toggleCourseStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req?.user?.id;
  const role = req?.user?.role;
  const result = await CourseService.toggleCourseStatus(id, status, role, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course status updated successfully',
    data: result,
  });
});

const isCourseExist = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await CourseService.isCourseExist(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course exists',
    data: result,
  });
});

const toggleCompleteCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const userId = req?.user?.id;
  const result = await CourseService.toggleCompleteCourse(userId, courseId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course completion toggled successfully',
    data: result,
  });
});

export const courseController = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  toggleDeleteCourse,
  toggleCourseStatus,
  isCourseExist,
  toggleCompleteCourse,
};
