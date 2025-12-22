import { ContentTypeEnum } from '@prisma/client';
import { z } from 'zod';

const createContent = z.object({
  body: z
    .object({
      contentType: z.nativeEnum(ContentTypeEnum),
      title: z.string(),
      description: z.string(),
      type: z.string().optional(),
      groupId: z.string(),
      authorId: z.string(),
    })
    .strict(),
});

const updateContent = z.object({
  body: z
    .object({
      contentType: z.nativeEnum(ContentTypeEnum).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      groupId: z.string().optional(),
      authorId: z.string().optional(),
    })
    .strict(),
});

export const ContentValidation = {
  createContent,
  updateContent,
};
