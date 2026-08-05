import { UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import {
  assertCourseAccess,
  changeIndexInContainer,
  loadCourseLevelItems,
  nextIndexForList,
  writeMixedIndexes,
  removeFromMixedList,
} from '../../utils/hierarchy.utils';
import { prisma } from '../../utils/prisma';

const createSemester = async (
  payload: { courseId: string; name: string },
  userId: string,
  role: UserRoleEnum,
) => {
  await assertCourseAccess(payload.courseId, userId, role);

  return prisma.$transaction(async tx => {
    const items = await loadCourseLevelItems(tx, payload.courseId);
    const index = nextIndexForList(items);

    return tx.semester.create({
      data: {
        name: payload.name,
        courseId: payload.courseId,
        index,
      },
    });
  });
};

const updateSemester = async (
  id: string,
  payload: { name: string },
  userId: string,
  role: UserRoleEnum,
) => {
  const semester = await prisma.semester.findFirst({
    where: { id, isDeleted: false },
  });
  if (!semester) {
    throw new AppError(httpStatus.NOT_FOUND, 'Semester not found');
  }

  await assertCourseAccess(semester.courseId, userId, role);

  return prisma.semester.update({
    where: { id },
    data: { name: payload.name },
  });
};

const changeSemesterIndex = async (
  id: string,
  newIndex: number,
  userId: string,
  role: UserRoleEnum,
) => {
  const semester = await prisma.semester.findFirst({
    where: { id, isDeleted: false },
  });
  if (!semester) {
    throw new AppError(httpStatus.NOT_FOUND, 'Semester not found');
  }

  await assertCourseAccess(semester.courseId, userId, role);

  await prisma.$transaction(async tx => {
    await changeIndexInContainer(tx, {
      container: 'COURSE',
      containerId: semester.courseId,
      itemId: id,
      kind: 'SEMESTER',
      newIndex,
    });
  });

  return prisma.semester.findUnique({ where: { id } });
};

const toggleDeleteSemester = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const semester = await prisma.semester.findUnique({ where: { id } });
  if (!semester) {
    throw new AppError(httpStatus.NOT_FOUND, 'Semester not found');
  }

  await assertCourseAccess(semester.courseId, userId, role);

  if (!semester.isDeleted) {
    await prisma.$transaction(async tx => {
      const items = await loadCourseLevelItems(tx, semester.courseId);
      const remaining = removeFromMixedList(items, id, 'SEMESTER');
      await writeMixedIndexes(tx, remaining);
      await tx.semester.update({
        where: { id },
        data: { isDeleted: true, index: 10000 },
      });
    });
  } else {
    await prisma.$transaction(async tx => {
      const items = await loadCourseLevelItems(tx, semester.courseId);
      await tx.semester.update({
        where: { id },
        data: { isDeleted: false, index: nextIndexForList(items) },
      });
    });
  }

  return prisma.semester.findUnique({ where: { id } });
};

const getSemestersByCourse = async (
  courseId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  await assertCourseAccess(courseId, userId, role);

  return prisma.semester.findMany({
    where: { courseId, isDeleted: false },
    orderBy: { index: 'asc' },
  });
};

export const SemesterService = {
  createSemester,
  updateSemester,
  changeSemesterIndex,
  toggleDeleteSemester,
  getSemestersByCourse,
};
