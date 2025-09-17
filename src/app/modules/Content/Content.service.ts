import { Content, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';
import {
  deleteFromDigitalOceanAWS,
  uploadToDigitalOceanAWS,
} from '../../utils/uploadToDigitalOceanAWS';

// Create new content
const createContent = async (
  payload: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>,
  coverImageFile?: Express.Multer.File,
  contentFile?: Express.Multer.File,
) => {
  if (!coverImageFile && !contentFile)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cover image or content file must be provided',
    );

  if (coverImageFile && contentFile)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot provide both cover image and content file at the same time',
    );

  if (payload.contentType === 'ARTICLE' && !coverImageFile)
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Cover image is required to create an ARTICLE',
    );

  if (payload.contentType === 'SERMONS' && !contentFile)
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Content file is required to create SERMONS',
    );

  if (coverImageFile && !coverImageFile.mimetype.startsWith('image'))
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Cover file must be an image',
    );

  if (
    contentFile &&
    !(
      contentFile.mimetype.startsWith('video') ||
      contentFile.mimetype.startsWith('audio')
    )
  )
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Content file must be a video or audio file',
    );

  if (coverImageFile)
    payload.coverImage = (
      await uploadToDigitalOceanAWS(coverImageFile)
    ).Location;

  if (contentFile)
    payload.fileLink = (await uploadToDigitalOceanAWS(contentFile)).Location;

  const content = await prisma.content.create({
    data: {
      ...payload,
    },
  });

  return content;
};

// Get content by ID with author info
const getContentById = async (id: string) => {
  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  return content;
};

// Get all content, ordered by creation date
const getAllContents = async (query: any) => {
  const notificationQuery = new QueryBuilder(prisma.content, query);
  const result = await notificationQuery
    .search(['name'])
    .filter()
    .sort()
    .exclude()
    .paginate()
    .customFields({
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      contentOrDescriptor: true,
      contentType: true,
      coverImage: true,
      createdAt: true,
      fileLink: true,
      id: true,
      tier: true,
      title: true,
      updatedAt: true,
    })
    .execute();
  return result;
};

// Update content (only by its author)

const updateContent = async ({
  id,
  user,
  payload,
  coverImageFile,
  contentFile,
}: {
  id: string;
  user: JwtPayload;
  payload: Partial<Omit<Content, 'id' | 'createdAt' | 'updatedAt'>>;
  coverImageFile?: Express.Multer.File;
  contentFile?: Express.Multer.File;
}) => {
  const existingContent = await prisma.content.findUnique({ where: { id } });

  if (!existingContent) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  if (
    user.role !== UserRoleEnum.SUPERADMIN &&
    existingContent.authorId !== user.id
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not allowed to update this content',
    );
  }

  const authorExist = await prisma.user.findUnique({
    where: { id: payload.authorId },
  });

  if (!authorExist)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not allowed to update this content',
    );

  // Validation for coverImageFile
  if (coverImageFile && !coverImageFile.mimetype.startsWith('image')) {
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Cover file must be an image',
    );
  }

  // Validation for contentFile
  if (
    contentFile &&
    !(
      contentFile.mimetype.startsWith('video') ||
      contentFile.mimetype.startsWith('audio')
    )
  ) {
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Content file must be a video or audio file',
    );
  }

  // Upload new files if provided
  if (coverImageFile) {
    payload.coverImage = (
      await uploadToDigitalOceanAWS(coverImageFile)
    ).Location;
    if (existingContent.coverImage)
      deleteFromDigitalOceanAWS(existingContent.coverImage);
  }

  if (contentFile) {
    payload.fileLink = (await uploadToDigitalOceanAWS(contentFile)).Location;
    if (existingContent.fileLink)
      deleteFromDigitalOceanAWS(existingContent.fileLink);
  }

  // Validate contentType-specific requirements
  const newContentType = payload.contentType || existingContent.contentType;

  if (
    newContentType === 'ARTICLE' &&
    !payload.coverImage &&
    !existingContent.coverImage
  ) {
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Cover image is required for ARTICLE',
    );
  }

  if (
    newContentType === 'SERMONS' &&
    !payload.fileLink &&
    !existingContent.fileLink
  ) {
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'Content file is required for SERMONS',
    );
  }

  const updated = await prisma.content.update({
    where: { id },
    data: { ...payload },
  });

  return updated;
};

// Delete content (only by its author)
const deleteContent = async (id: string, user: JwtPayload) => {
  const existingContent = await prisma.content.findUnique({ where: { id } });

  if (!existingContent) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  if (
    user.role !== UserRoleEnum.SUPERADMIN &&
    existingContent.authorId !== user.id
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only delete your own content',
    );
  }

  await prisma.content.delete({ where: { id } });

  return { message: 'Content deleted successfully' };
};

export const ContentService = {
  createContent,
  getContentById,
  getAllContents,
  updateContent,
  deleteContent,
};
