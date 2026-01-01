import { z } from 'zod';
import { CourseStatus } from '@prisma/client';

const createCourse = z.object({
  body: z
    .object({
      title: z.string(),
      instructorId: z.string(),
      description: z.string(),
      status: z.enum(CourseStatus).optional(),
    })
    .strict(),
});

const updateCourse = z.object({
  body: z
    .object({
      title: z.string().optional(),
      instructorId: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(CourseStatus).optional(),
    })
    .strict(),
});

const toggleAssignToGroup = z.object({
  body: z
    .object({
      courseId: z.string(),
      groupId: z.string(),
    })
    .strict(),
});

const toggleStatus = z.object({
  body: z
    .object({
      status: z.enum(CourseStatus),
    })
    .strict(),
});

const toggleAssignCourseToGroup = z.object({
  body: z
    .object({
      courseId: z.string(),
      groupId: z.string(),
    })
    .strict(),
});

export const courseValidation = {
  createCourse,
  updateCourse,
  toggleStatus,
  toggleAssignCourseToGroup,
};
