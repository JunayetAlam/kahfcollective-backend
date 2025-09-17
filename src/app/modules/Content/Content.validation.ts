import { ContentTypeEnum, TiersLevelEnum } from '@prisma/client';
import { z } from 'zod';

const createContent = z.object({
  body: z
    .object({
      contentType: z.nativeEnum(ContentTypeEnum),
      title: z.string().min(1),
      contentOrDescriptor: z.string().min(1),
      tier: z.nativeEnum(TiersLevelEnum),
      authorId: z.string().min(1),
    })
    .strict(),
});

const updateContent = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      contentOrDescriptor: z.string().min(1).optional(),
      tier: z.nativeEnum(TiersLevelEnum).optional(),
      authorId: z.string().min(1).optional(),
    })
    .strict(),
});

export const ContentValidation = {
  createContent,
  updateContent,
};
