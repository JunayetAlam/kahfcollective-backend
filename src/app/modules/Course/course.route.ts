import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { courseController } from './course.controller';
import { courseValidation } from './course.validation';

const router = express.Router();

router.post(
  '/',
  auth('INSTRUCTOR'),
  validateRequest.body(courseValidation.createCourse),
  courseController.createCourse
);

router.get('/', auth('UNAUTHORIZED'), courseController.getAllCourses);

router.get('/:id',auth('UNAUTHORIZED'), courseController.getCourseById);
router.get('/admin/:id', auth('SUPERADMIN'), courseController.getCourseById);

router.patch(
  '/:id',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(courseValidation.updateCourse),
  courseController.updateCourse
);

router.patch(
  '/:id/toggle-delete',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.toggleDeleteCourse
);

router.patch(
  '/:id/toggle-status',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  validateRequest.body(courseValidation.toggleStatus),
  courseController.toggleCourseStatus
);

router.get('/:id/exist', courseController.isCourseExist);

router.patch(
  '/:courseId/toggle-complete',
  auth('USER'),
  courseController.toggleCompleteCourse
);
router.post(
  '/enroll',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.toggleEnrollCourse
);
router.post(
  '/enrolled-students/:courseId',
  auth('INSTRUCTOR', 'SUPERADMIN'),
  courseController.enrolledUserOnCourse
);

export const CourseRouters = router;
