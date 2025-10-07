import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CoursecontentService } from './coursecontent.service';

const createVideoContent = catchAsync(async (req, res) => {
  const result = await CoursecontentService.createVideoContent(
    req.body,
    req.file,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Video content created successfully',
    data: result,
  });
});

const updateVideoContent = catchAsync(async (req, res) => {
  const contentId = req.params.id;
  const video = req.file;

  const result = await CoursecontentService.updateVideo(
    req.user.id,
    req.user.role,
    contentId,
    video,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Video content updated successfully',
    data: result,
  });
});

const createQuizContent = catchAsync(async (req, res) => {
  const result = await CoursecontentService.createQuizContent(
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Quiz content created successfully',
    data: result,
  });
});

const updateContent = catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const result = await CoursecontentService.updateContent(
    contentId,
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content updated successfully',
    data: result,
  });
});

const toggleDeleteContent = catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const result = await CoursecontentService.toggleDeleteContent(
    contentId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content delete status updated successfully',
    data: result,
  });
});

const createQuiz = catchAsync(async (req, res) => {
  const result = await CoursecontentService.createQuiz(
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Quiz created successfully',
    data: result,
  });
});

const updateQuiz = catchAsync(async (req, res) => {
  const { quizId } = req.params;
  const result = await CoursecontentService.updateQuiz(
    quizId,
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz updated successfully',
    data: result,
  });
});

// For owners/superadmins
const getAllContentForSpecificCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const result = await CoursecontentService.getAllContentForSpecificCourse(
    courseId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course contents retrieved successfully',
    data: result,
  });
});

const getSingleContent = catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const result = await CoursecontentService.getSingleContent(
    contentId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content retrieved successfully',
    data: result,
  });
});

const getAllQuizForSpecificCourseContent = catchAsync(async (req, res) => {
  const { courseContentId } = req.params;
  const result = await CoursecontentService.getAllQuizForSpecificCourseContent(
    courseContentId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course content quizzes retrieved successfully',
    data: result,
  });
});

const getSingleQuiz = catchAsync(async (req, res) => {
  const { quizId } = req.params;
  const result = await CoursecontentService.getSingleQuiz(
    quizId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz retrieved successfully',
    data: result,
  });
});

// For normal users
const getAllContentForSpecificCourseForUser = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const result =
    await CoursecontentService.getAllContentForSpecificCourseForUser(
      courseId,
      req.user.id,
    );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Course contents retrieved successfully',
    data: result,
  });
});

const getSingleContentForUser = catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const result = await CoursecontentService.getSingleContentForUser(
    contentId,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content retrieved successfully',
    data: result,
  });
});

const getAllQuizForSpecificCourseContentForUser = catchAsync(
  async (req, res) => {
    const { courseContentId } = req.params;
    const result =
      await CoursecontentService.getAllQuizForSpecificCourseContentForUser(
        courseContentId,
        req.user.id,
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Course content quizzes retrieved successfully',
      data: result,
    });
  },
);

const getSingleQuizForUser = catchAsync(async (req, res) => {
  const { quizId } = req.params;
  const result = await CoursecontentService.getSingleQuizForUser(
    quizId,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz retrieved successfully',
    data: result,
  });
});

const toggleDeleteQuiz = catchAsync(async (req, res) => {
  const { quizId } = req.params;
  const result = await CoursecontentService.toggleDeleteQuiz(
    quizId,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz delete status updated successfully',
    data: result,
  });
});

const changeContentIndex = catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const { newIndex } = req.body;
  const result = await CoursecontentService.changeContentIndex(
    contentId,
    newIndex,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content index updated successfully',
    data: result,
  });
});

const changeQuizIndex = catchAsync(async (req, res) => {
  const { quizId } = req.params;
  const { newIndex } = req.body;
  const result = await CoursecontentService.changeQuizIndex(
    quizId,
    newIndex,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz index updated successfully',
    data: result,
  });
});

const createQuestionContent = catchAsync(async (req, res) => {
  const result = await CoursecontentService.createQuestionContent(
    req.body,
    req.user.id,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Quiz content created successful',
    data: result,
  });
});

const answerQuestionContent = catchAsync(async (req, res) => {
  const result = await CoursecontentService.answerQuestionContent(
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Answer submitted successful',
    data: result,
  });
});

export const CourseContentController = {
  createVideoContent,
  updateVideoContent,
  createQuizContent,
  updateContent,
  toggleDeleteContent,
  createQuiz,
  updateQuiz,
  // For owners/superadmins
  getAllContentForSpecificCourse,
  getSingleContent,
  getAllQuizForSpecificCourseContent,
  getSingleQuiz,
  // For normal users
  getAllContentForSpecificCourseForUser,
  getSingleContentForUser,
  getAllQuizForSpecificCourseContentForUser,
  getSingleQuizForUser,
  // Other methods
  toggleDeleteQuiz,
  changeContentIndex,
  changeQuizIndex,
  createQuestionContent,
  answerQuestionContent,
};
