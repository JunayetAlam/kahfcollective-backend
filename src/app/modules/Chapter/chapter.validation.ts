import { z } from 'zod';

const createChapter = z.object({
  body: z
    .object({
      semesterId: z.string(),
      name: z.string().trim().min(1),
    })
    .strict(),
});

const updateChapter = z.object({
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

const moveChapter = z.object({
  body: z
    .object({
      semesterId: z.string(),
      newIndex: z.number().int().positive(),
    })
    .strict(),
});

export const ChapterValidation = {
  createChapter,
  updateChapter,
  changeIndex,
  moveChapter,
};
