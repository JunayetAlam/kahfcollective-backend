import { z } from 'zod';

const markContentProgress = z.object({
  body: z
    .object({
      courseContentId: z.string().min(1),
    })
    .strict(),
});

export const AnalyticsValidation = {
  markContentProgress,
};
