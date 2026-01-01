import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { courseController } from './course.controller';
import { courseValidation } from './course.validation';
import { upload } from '../../middlewares/upload';
import { parseBody } from '../../middlewares/parseBody';

const router = express.Router();

router.post(
  '/',
  upload.single('thumbnail'),
  auth('INSTRUCTOR', 'SUPERADMIN'),
  parseBody,
  validateRequest.body(courseValidation.createCourse),
  courseController.createCourse,
);

router.get('/', auth('UNAUTHORIZED'), courseController.getAllCourses);

router.get('/:id', auth('UNAUTHORIZED'), courseController.getCourseById);
router.get('/admin/:id', auth('SUPERADMIN'), courseController.getCourseById);

router.patch(
  '/:id',
  upload.single('thumbnail'),
  auth('INSTRUCTOR', 'SUPERADMIN'),
  parseBody,
  validateRequest.body(courseValidation.updateCourse),
  courseController.updateCourse,
);

router.patch(
  '/:id/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.toggleDeleteCourse,
);

router.patch(
  '/:id/toggle-status',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(courseValidation.toggleStatus),
  courseController.toggleCourseStatus,
);

router.get('/:id/exist', courseController.isCourseExist);

router.patch(
  '/:courseId/toggle-complete',
  auth('USER'),
  courseController.toggleCompleteCourse,
);
router.post(
  '/enroll',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.toggleEnrollCourse,
);
router.post(
  '/enrolled-students/:courseId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.enrolledUserOnCourse,
);
router.post(
  '/assign-course-to-group',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(courseValidation.toggleAssignCourseToGroup),
  courseController.toggleAssignCourseToGroup,
);
router.patch(
  '/:courseId/toggle-allow-to-all',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.toggleAllowToAll,
);
export const CourseRouters = router;
