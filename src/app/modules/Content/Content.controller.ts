import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ContentService } from './Content.service';

// Create new content
const createContent = catchAsync(async (req, res) => {
  const { body, files } = req;
  const coverImageFile = (files as any)['thumbnail'] ?? [];
  const contentFile = (files as any)['content'] ?? [];

  const result = await ContentService.createContent(
    body,
    coverImageFile[0],
    contentFile[0],
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Content created successfully',
    data: result,
  });
});

// Get content by ID
const getContentById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await ContentService.getContentById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content fetched successfully',
    data: result,
  });
});

// Get all content with optional query params
const getAllContents = catchAsync(async (req, res) => {
  const result = await ContentService.getAllContents(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Contents fetched successfully',
    data: result,
  });
});

// Update content
export const updateContent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { files } = req;
  const coverImageFile = (files as any)['thumbnail'] ?? [];
  const contentFile = (files as any)['content'] ?? [];

  const result = await ContentService.updateContent( id,
    req.body,
    coverImageFile[0],
    contentFile[0]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content updated successfully',
    data: result,
  });
});

// Delete content
const deleteContent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await ContentService.deleteContent(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Content deleted successfully',
    data: result,
  });
});

export const ContentControllers = {
  createContent,
  getContentById,
  getAllContents,
  updateContent,
  deleteContent,
};
