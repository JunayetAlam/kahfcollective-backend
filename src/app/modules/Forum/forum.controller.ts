import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ForumService } from './forum.service';

const createCircleForum = catchAsync(async (req, res) => {
  const result = await ForumService.createCircleForum(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Circle forum created successfully',
    data: result,
  });
});

const createLocationForum = catchAsync(async (req, res) => {
  const result = await ForumService.createLocationForum(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Location forum created successfully',
    data: result,
  });
});

const updateCircleForum = catchAsync(async (req, res) => {
  const { forumId } = req.params;
  const result = await ForumService.updateCircleForum(forumId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Circle forum updated successfully',
    data: result,
  });
});

const updateLocationForum = catchAsync(async (req, res) => {
  const { forumId } = req.params;
  const result = await ForumService.updateLocationForum(forumId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Location forum updated successfully',
    data: result,
  });
});

const getSingleForum = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ForumService.getSingleForum(id, req.user.id, req.user.role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Forum retrieved successfully',
    data: result,
  });
});

const getAllForums = catchAsync(async (req, res) => {
  const result = await ForumService.getAllForums(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Forums retrieved successfully',
    data: result,
  });
});

const deleteForum = catchAsync(async (req, res) => {
  const { forumId } = req.params;
  const result = await ForumService.deleteForum(forumId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Forum deleted successfully',
    data: result,
  });
});
const joinForum = catchAsync(async (req, res) => {
  const { forumId } = req.params;
  const result = await ForumService.joinForum(req.user.id, forumId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Joined on Discussion Perfectly',
    data: result,
  });
});
const getAllConnectedUserToForum = catchAsync(async (req, res) => {
  const { forumId } = req.params;
  const result = await ForumService.getAllConnectedUserToForum(forumId, req.user.id, req.user.role, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Joined User Retrieved Successfully',
    data: result,
  });
});

export const ForumController = {
  createCircleForum,
  createLocationForum,
  updateCircleForum,
  updateLocationForum,
  getSingleForum,
  getAllForums,
  deleteForum,
  joinForum,
  getAllConnectedUserToForum
};
