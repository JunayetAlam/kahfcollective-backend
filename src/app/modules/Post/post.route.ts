import express from 'express';
import auth from '../../middlewares/auth';
import { PostControllers } from './post.controller';
import { parseBody } from '../../middlewares/parseBody';
import validateRequest from '../../middlewares/validateRequest';
import { postValidation } from './post.validation';

const router = express.Router();

// Create a post in a forum
router.post(
  '/:forumId',
  auth('ANY'),
  parseBody,
  validateRequest.body(postValidation.postOrReply),
  PostControllers.createPost,
);

// Reply to a post
router.post(
  '/reply/:postId',
  auth('ANY'),
  parseBody,
  validateRequest.body(postValidation.postOrReply),
  PostControllers.replyToPost,
);

// Reply to a reply
router.post(
  '/reply-to-reply/:parentReplyId',
  auth('ANY'),
  parseBody,
  validateRequest.body(postValidation.postOrReply),
  PostControllers.replyToReply,
);

// React to a post (toggle)
router.post(
  '/react/:postId',
  auth('ANY'),
  PostControllers.giveReact,
);

// Get all posts for a forum
router.get(
  '/forum/:forumId',
  auth('ANY'),
  PostControllers.getAllPostForSpecificForum,
);

// Get all replies for a post
router.get(
  '/replies/:postId',
  auth('ANY'),
  PostControllers.getAllReplyForSpecificPost,
);

// Get all reactions for a post
router.get(
  '/reacts/:postId',
  auth('ANY'),
  PostControllers.getAllReactForPost,
);

export const PostRouters = router;
