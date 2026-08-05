import { z } from 'zod';

const createSemester = z.object({
  body: z
    .object({
      courseId: z.string(),
      name: z.string().trim().min(1),
    })
    .strict(),
});

const updateSemester = z.object({
  body: z
    .object({
      name: z.string().trim().min(1),
    })
    .strict(),
});

const changeIndex = z.object({
  body: z
    .object({
      newIndex: z.number().int().positive(),
    })
    .strict(),
});

export const SemesterValidation = {
  createSemester,
  updateSemester,
  changeIndex,
};
