import { z } from 'zod';
import { CourseStatus } from '@prisma/client';

const createCourse = z.object({
  body: z
    .object({
      title: z.string(),
      instructorId: z.string(),
      description: z.string(),
      language: z.string(),
      status: z.nativeEnum(CourseStatus).optional(),
    })
    .strict(),
});

const updateCourse = z.object({
  body: z
    .object({
      title: z.string().optional(),
      instructorId: z.string().optional(),
      description: z.string().optional(),
      language: z.string().optional(),
      status: z.nativeEnum(CourseStatus).optional(),
    })
    .strict(),
});

const toggleStatus = z.object({
  body: z
    .object({
      status: z.nativeEnum(CourseStatus),
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
