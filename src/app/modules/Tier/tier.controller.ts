import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { tierService } from './tier.service';

const createTier = catchAsync(async (req, res) => {
  const result = await tierService.createTier(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Tier created successfully',
    data: result,
  });
});

const getAllTiers = catchAsync(async (req, res) => {
  const query = req.query;
  const role = req?.user?.role || 'USER';
  const result = await tierService.getAllTiers(query, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Tiers retrieved successfully',
    ...result,
  });
});

const getTierById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const role = req?.user?.role || 'USER';
  const result = await tierService.getTierById(id, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Tier retrieved successfully',
    data: result,
  });
});

const updateTier = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await tierService.updateTier(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Tier updated successfully',
    data: result,
  });
});

const toggleDeleteTier = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await tierService.toggleDeleteTier(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Tier delete status toggled successfully',
    data: result,
  });
});
const toggleAssignTier = catchAsync(async (req, res) => {
  const { userId, tierId } = req.body;

  const result = await tierService.toggleAssignTier(userId, tierId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Tier delete status toggled successfully',
    data: result,
  });
});


export const tierController = {
  createTier,
  getAllTiers,
  getTierById,
  updateTier,
  toggleDeleteTier,
  toggleAssignTier,
};
