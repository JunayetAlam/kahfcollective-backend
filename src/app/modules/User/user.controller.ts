import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';
import { Request } from 'express';

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Users retrieved successfully',
    ...result,
  });
});
const getGroupUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getGroupUsers(
    req.params.groupId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Users retrieved successfully',
    ...result,
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const id = req.user.id;
  const result = await UserServices.getMyProfileFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile retrieved successfully',
    data: result,
  });
});

const getUserDetails = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.getUserDetailsFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User details retrieved successfully',
    data: result,
  });
});

// Update profile fields
const updateMyProfile = catchAsync(async (req: Request, res) => {
  const id = req.user.id;
  const payload = req.body;

  const result = await UserServices.updateMyProfileIntoDB(id, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User profile updated successfully',
    data: result,
  });
});

// Update profile image
const updateProfileImage = catchAsync(async (req: Request, res) => {
  const id = req.user.id;
  const file = req.file;
  const previousImg = req.user.profile || '';

  const result = await UserServices.updateProfileImg(
    id,
    previousImg,
    req,
    file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile image updated successfully',
    data: result,
  });
});

const updateUserRoleStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const role = req.body.role;
  const result = await UserServices.updateUserRoleStatusIntoDB(
    id,
    role,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User role updated successfully',
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const status = req.body.status;
  const result = await UserServices.updateProfileStatus(
    id,
    status,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User status updated successfully',
    data: result,
  });
});
const toggleIsUserVerified = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.toggleIsUserVerified(id, req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User verifyStatus Update successfully',
    data: result,
  });
});
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.deleteUser(id, req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User Deleted successfully',
    data: result,
  });
});

const createMultipleUser = catchAsync(async (req, res) => {
  const { users } = req.body;
  const result = await UserServices.createMultipleUser(users);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User Created successfully',
    data: result,
  });
});
const updatePassword = catchAsync(async (req, res) => {
  const { id } = req.params;
  const password = req.body.password;
  const result = await UserServices.updatePassword(id, password);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User password updated successfully',
    data: result,
  });
});
const getMultipleGroupUsers = catchAsync(async (req, res) => {
  const { groupIds } = req.query;
  const ids = (groupIds as string).split(',').filter(id => !!id);
  const result = await UserServices.getMultipleGroupUsers(ids, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User Created successfully',
    ...result,
  });
});

export const UserControllers = {
  getAllUsers,
  getGroupUsers,
  getMyProfile,
  getUserDetails,
  updateMyProfile,
  updateProfileImage,
  updateUserRoleStatus,
  updateUserStatus,
  toggleIsUserVerified,
  deleteUser,
  updatePassword,
  createMultipleUser,
  getMultipleGroupUsers,
};
