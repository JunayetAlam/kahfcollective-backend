import { UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import {
  assertCourseAccess,
  changeIndexInContainer,
  loadSemesterLevelItems,
  moveItemBetweenContainers,
  nextIndexForList,
  removeFromMixedList,
  writeMixedIndexes,
} from '../../utils/hierarchy.utils';
import { prisma } from '../../utils/prisma';

const createChapter = async (
  payload: { semesterId: string; name: string },
  userId: string,
  role: UserRoleEnum,
) => {
  const semester = await prisma.semester.findFirst({
    where: { id: payload.semesterId, isDeleted: false },
  });
  if (!semester) {
    throw new AppError(httpStatus.NOT_FOUND, 'Semester not found');
  }

  await assertCourseAccess(semester.courseId, userId, role);

  return prisma.$transaction(async tx => {
    const items = await loadSemesterLevelItems(tx, semester.id);
    const index = nextIndexForList(items);

    return tx.chapter.create({
      data: {
        name: payload.name,
        semesterId: semester.id,
        courseId: semester.courseId,
        index,
      },
    });
  });
};

const updateChapter = async (
  id: string,
  payload: { name: string },
  userId: string,
  role: UserRoleEnum,
) => {
  const chapter = await prisma.chapter.findFirst({
    where: { id, isDeleted: false },
  });
  if (!chapter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chapter not found');
  }

  await assertCourseAccess(chapter.courseId, userId, role);

  return prisma.chapter.update({
    where: { id },
    data: { name: payload.name },
  });
};

const changeChapterIndex = async (
  id: string,
  newIndex: number,
  userId: string,
  role: UserRoleEnum,
) => {
  const chapter = await prisma.chapter.findFirst({
    where: { id, isDeleted: false },
  });
  if (!chapter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chapter not found');
  }

  await assertCourseAccess(chapter.courseId, userId, role);

  await prisma.$transaction(async tx => {
    await changeIndexInContainer(tx, {
      container: 'SEMESTER',
      containerId: chapter.semesterId,
      itemId: id,
      kind: 'CHAPTER',
      newIndex,
    });
  });

  return prisma.chapter.findUnique({ where: { id } });
};

const moveChapter = async (
  id: string,
  payload: { semesterId: string; newIndex: number },
  userId: string,
  role: UserRoleEnum,
) => {
  const chapter = await prisma.chapter.findFirst({
    where: { id, isDeleted: false },
  });
  if (!chapter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chapter not found');
  }

  await assertCourseAccess(chapter.courseId, userId, role);

  const targetSemester = await prisma.semester.findFirst({
    where: { id: payload.semesterId, isDeleted: false },
  });
  if (!targetSemester) {
    throw new AppError(httpStatus.NOT_FOUND, 'Target semester not found');
  }
  if (targetSemester.courseId !== chapter.courseId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot move chapter to a semester in another course',
    );
  }

  await prisma.$transaction(async tx => {
    await moveItemBetweenContainers(tx, {
      itemId: id,
      kind: 'CHAPTER',
      from: { container: 'SEMESTER', id: chapter.semesterId },
      to: { container: 'SEMESTER', id: payload.semesterId },
      newIndex: payload.newIndex,
      afterRemoveUpdate: async () => {
        await tx.chapter.update({
          where: { id },
          data: { semesterId: payload.semesterId },
        });
        // Keep nested contents' semesterId in sync
        await tx.courseContents.updateMany({
          where: { chapterId: id, isDeleted: false },
          data: { semesterId: payload.semesterId },
        });
      },
    });
  });

  return prisma.chapter.findUnique({ where: { id } });
};

const toggleDeleteChapter = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chapter not found');
  }

  await assertCourseAccess(chapter.courseId, userId, role);

  if (!chapter.isDeleted) {
    await prisma.$transaction(async tx => {
      const items = await loadSemesterLevelItems(tx, chapter.semesterId);
      const remaining = removeFromMixedList(items, id, 'CHAPTER');
      await writeMixedIndexes(tx, remaining);
      await tx.chapter.update({
        where: { id },
        data: { isDeleted: true, index: 10000 },
      });
    });
  } else {
    await prisma.$transaction(async tx => {
      const items = await loadSemesterLevelItems(tx, chapter.semesterId);
      await tx.chapter.update({
        where: { id },
        data: { isDeleted: false, index: nextIndexForList(items) },
      });
    });
  }

  return prisma.chapter.findUnique({ where: { id } });
};

const getChaptersBySemester = async (
  semesterId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const semester = await prisma.semester.findFirst({
    where: { id: semesterId, isDeleted: false },
  });
  if (!semester) {
    throw new AppError(httpStatus.NOT_FOUND, 'Semester not found');
  }

  await assertCourseAccess(semester.courseId, userId, role);

  return prisma.chapter.findMany({
    where: { semesterId, isDeleted: false },
    orderBy: { index: 'asc' },
  });
};

export const ChapterService = {
  createChapter,
  updateChapter,
  changeChapterIndex,
  moveChapter,
  toggleDeleteChapter,
  getChaptersBySemester,
};
