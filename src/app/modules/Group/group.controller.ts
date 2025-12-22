import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { groupService } from './group.service';

const createGroup = catchAsync(async (req, res) => {
  const result = await groupService.createGroup(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Group created successfully',
    data: result,
  });
});

const getAllGroups = catchAsync(async (req, res) => {
  const query = req.query;
  const role = req?.user?.role || 'USER';
  const result = await groupService.getAllGroups(query, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Groups retrieved successfully',
    ...result,
  });
});

const getGroupById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const role = req?.user?.role || 'USER';
  const result = await groupService.getGroupById(id, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Group retrieved successfully',
    data: result,
  });
});

const updateGroup = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.updateGroup(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Group updated successfully',
    data: result,
  });
});

const toggleDeleteGroup = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.toggleDeleteGroup(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Group delete status toggled successfully',
    data: result,
  });
});
const toggleAssignGroup = catchAsync(async (req, res) => {
  const { userId, groupId } = req.body;

  const result = await groupService.toggleAssignGroup(userId, groupId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Group delete status toggled successfully',
    data: result,
  });
});


export const groupController = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  toggleDeleteGroup,
  toggleAssignGroup,
};
