import { z } from "zod";

const eventSchema = z.object({
  id: z.string().optional(),
  eventName: z.string(),
  about: z.string(),
  location: z.string(),
  date: z.string(),
  time: z.string(),
});

const createCircleForum = z.object({
  body: z
    .object({
      title: z.string(),
      description: z.string(),
      courseId: z.string(),
      groupId: z.string(),
    })
    .strict(),
});

const createLocationForum = z.object({
  body: z
    .object({
      title: z.string(),
      description: z.string(),
      country: z.string(),
      groupId: z.string(),
      events: z.array(eventSchema),
    })
    .strict(),
});

const updateCircleForum = z.object({
  body: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      courseId: z.string().optional(),
      groupId: z.string().optional(),
    })
    .strict(),
});

const updateLocationForum = z.object({
  body: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      country: z.string().optional(),
      groupId: z.string().optional(),
      events: z.array(eventSchema).optional(),
    })
    .strict(),
});

export const forumValidation = {
  createCircleForum,
  createLocationForum,
  updateCircleForum,
  updateLocationForum,
};
