import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PostService } from './post.service';
import { Request } from 'express';

// Create a post
const createPost = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { forumId } = req.params;
  const payload = req.body;

  const result = await PostService.createPost(userId, forumId, payload, role);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Post created successfully',
    data: result,
  });
});

// Reply to a post
const replyToPost = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { postId } = req.params;
  const payload = req.body;

  const result = await PostService.replyToPost(userId, postId, payload, role);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Reply added successfully',
    data: result,
  });
});

// Reply to a reply
const replyToReply = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { parentReplyId } = req.params;
  const payload = req.body;

  const result = await PostService.replyToReply(userId, parentReplyId, payload, role);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Reply to reply added successfully',
    data: result,
  });
});

// React to a post
const giveReact = catchAsync(async (req: Request, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { postId } = req.params;

  const result = await PostService.giveReact(userId, postId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Reaction updated successfully',
    data: result,
  });
});

// Get all posts for a specific forum
const getAllPostForSpecificForum = catchAsync(async (req: Request, res) => {
  const { forumId } = req.params;

  const result = await PostService.getAllPostForSpecificForum(forumId, req.query, req.user.role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Posts retrieved successfully',
    ...result,
  });
});
const getAllPost = catchAsync(async (req: Request, res) => {

  const result = await PostService.getAllPost(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Posts retrieved successfully',
    ...result,
  });
});

// Get all replies for a specific post
const getAllReplyForSpecificPost = catchAsync(async (req: Request, res) => {
  const { postId } = req.params;

  const result = await PostService.getAllReplyForSpecificPost(postId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Replies retrieved successfully',
    ...result,
  });
});

// Get all reactions for a specific post
const getAllReactForPost = catchAsync(async (req: Request, res) => {
  const { postId } = req.params;

  const result = await PostService.getAllReactForPost(postId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Reactions retrieved successfully',
    ...result,
  });
});
const togglePublish = catchAsync(async (req: Request, res) => {
  const { postId } = req.params;

  const result = await PostService.togglePublish(postId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Post publish status toggled successfully',
    data: result,
  });
});
const toggleDeletePost = catchAsync(async (req: Request, res) => {
  const { postId } = req.params;

  const result = await PostService.toggleDeletePost(postId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Post deleted s successfully',
    data: result,
  });
});

export const PostControllers = {
  createPost,
  replyToPost,
  replyToReply,
  giveReact,
  getAllPostForSpecificForum,
  getAllReplyForSpecificPost,
  getAllReactForPost,
  togglePublish,
  getAllPost,
  toggleDeletePost
};