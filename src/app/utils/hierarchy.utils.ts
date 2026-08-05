import { Prisma, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { prisma } from '../utils/prisma';

export type PrismaTx = Prisma.TransactionClient;

export type MixedKind = 'SEMESTER' | 'CHAPTER' | 'CONTENT';

export type MixedItem = {
  kind: MixedKind;
  id: string;
  index: number;
};

export const courseOwnershipWhere = (role: UserRoleEnum, userId: string) => {
  if (role === UserRoleEnum.SUPERADMIN) {
    return { isDeleted: false };
  }
  return { isDeleted: false, instructorId: userId };
};

export const assertCourseAccess = async (
  courseId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...courseOwnershipWhere(role, userId),
    },
  });
  if (!course) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }
  return course;
};

/** Course-level items: semesters + course-scoped contents (no semester/chapter). */
export const loadCourseLevelItems = async (
  tx: PrismaTx,
  courseId: string,
): Promise<MixedItem[]> => {
  const [semesters, contents] = await Promise.all([
    tx.semester.findMany({
      where: { courseId, isDeleted: false },
      select: { id: true, index: true },
    }),
    tx.courseContents.findMany({
      where: {
        courseId,
        isDeleted: false,
        semesterId: null,
        chapterId: null,
      },
      select: { id: true, index: true },
    }),
  ]);

  return [
    ...semesters.map(s => ({ kind: 'SEMESTER' as const, id: s.id, index: s.index })),
    ...contents.map(c => ({ kind: 'CONTENT' as const, id: c.id, index: c.index })),
  ].sort((a, b) => a.index - b.index);
};

/** Semester-level items: chapters + semester-scoped contents (no chapter). */
export const loadSemesterLevelItems = async (
  tx: PrismaTx,
  semesterId: string,
): Promise<MixedItem[]> => {
  const [chapters, contents] = await Promise.all([
    tx.chapter.findMany({
      where: { semesterId, isDeleted: false },
      select: { id: true, index: true },
    }),
    tx.courseContents.findMany({
      where: {
        semesterId,
        isDeleted: false,
        chapterId: null,
      },
      select: { id: true, index: true },
    }),
  ]);

  return [
    ...chapters.map(c => ({ kind: 'CHAPTER' as const, id: c.id, index: c.index })),
    ...contents.map(c => ({ kind: 'CONTENT' as const, id: c.id, index: c.index })),
  ].sort((a, b) => a.index - b.index);
};

export const loadChapterLevelItems = async (
  tx: PrismaTx,
  chapterId: string,
): Promise<MixedItem[]> => {
  const contents = await tx.courseContents.findMany({
    where: { chapterId, isDeleted: false },
    select: { id: true, index: true },
  });

  return contents
    .map(c => ({ kind: 'CONTENT' as const, id: c.id, index: c.index }))
    .sort((a, b) => a.index - b.index);
};

export const writeMixedIndexes = async (
  tx: PrismaTx,
  items: MixedItem[],
) => {
  await Promise.all(
    items.map((item, i) => {
      const index = i + 1;
      if (item.kind === 'SEMESTER') {
        return tx.semester.update({
          where: { id: item.id },
          data: { index },
        });
      }
      if (item.kind === 'CHAPTER') {
        return tx.chapter.update({
          where: { id: item.id },
          data: { index },
        });
      }
      return tx.courseContents.update({
        where: { id: item.id },
        data: { index },
      });
    }),
  );
};

export const reorderMixedList = (
  items: MixedItem[],
  itemId: string,
  kind: MixedKind,
  newIndex: number,
): MixedItem[] => {
  const currentPos = items.findIndex(i => i.id === itemId && i.kind === kind);
  if (currentPos === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in container');
  }

  if (newIndex < 1 || newIndex > items.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Index must be between 1 and ${items.length}`,
    );
  }

  if (currentPos + 1 === newIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(currentPos, 1);
  next.splice(newIndex - 1, 0, moved);
  return next;
};

export const insertIntoMixedList = (
  items: MixedItem[],
  item: MixedItem,
  newIndex: number,
): MixedItem[] => {
  const maxIndex = items.length + 1;
  if (newIndex < 1 || newIndex > maxIndex) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Index must be between 1 and ${maxIndex}`,
    );
  }
  const next = [...items];
  next.splice(newIndex - 1, 0, item);
  return next;
};

export const removeFromMixedList = (
  items: MixedItem[],
  itemId: string,
  kind: MixedKind,
): MixedItem[] => {
  return items.filter(i => !(i.id === itemId && i.kind === kind));
};

export const nextIndexForList = (items: MixedItem[]) => items.length + 1;

export const resolveContentScope = (content: {
  semesterId: string | null;
  chapterId: string | null;
}): 'COURSE' | 'SEMESTER' | 'CHAPTER' => {
  if (content.chapterId) return 'CHAPTER';
  if (content.semesterId) return 'SEMESTER';
  return 'COURSE';
};

export const validateAndResolveContentParents = async ({
  courseId,
  semesterId,
  chapterId,
}: {
  courseId: string;
  semesterId?: string | null;
  chapterId?: string | null;
}) => {
  if (chapterId) {
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, isDeleted: false },
    });
    if (!chapter) {
      throw new AppError(httpStatus.NOT_FOUND, 'Chapter not found');
    }
    if (chapter.courseId !== courseId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Chapter does not belong to this course',
      );
    }
    if (semesterId && semesterId !== chapter.semesterId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Chapter does not belong to this semester',
      );
    }
    return {
      courseId: chapter.courseId,
      semesterId: chapter.semesterId,
      chapterId: chapter.id,
    };
  }

  if (semesterId) {
    const semester = await prisma.semester.findFirst({
      where: { id: semesterId, isDeleted: false },
    });
    if (!semester) {
      throw new AppError(httpStatus.NOT_FOUND, 'Semester not found');
    }
    if (semester.courseId !== courseId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Semester does not belong to this course',
      );
    }
    return {
      courseId: semester.courseId,
      semesterId: semester.id,
      chapterId: null as string | null,
    };
  }

  return {
    courseId,
    semesterId: null as string | null,
    chapterId: null as string | null,
  };
};

export const getNextContentIndex = async (
  tx: PrismaTx,
  parents: {
    courseId: string;
    semesterId: string | null;
    chapterId: string | null;
  },
) => {
  if (parents.chapterId) {
    const items = await loadChapterLevelItems(tx, parents.chapterId);
    return nextIndexForList(items);
  }
  if (parents.semesterId) {
    const items = await loadSemesterLevelItems(tx, parents.semesterId);
    return nextIndexForList(items);
  }
  const items = await loadCourseLevelItems(tx, parents.courseId);
  return nextIndexForList(items);
};

export const changeIndexInContainer = async (
  tx: PrismaTx,
  opts: {
    container: 'COURSE' | 'SEMESTER' | 'CHAPTER';
    containerId: string;
    itemId: string;
    kind: MixedKind;
    newIndex: number;
  },
) => {
  let items: MixedItem[];
  if (opts.container === 'COURSE') {
    items = await loadCourseLevelItems(tx, opts.containerId);
  } else if (opts.container === 'SEMESTER') {
    items = await loadSemesterLevelItems(tx, opts.containerId);
  } else {
    items = await loadChapterLevelItems(tx, opts.containerId);
  }

  const reordered = reorderMixedList(
    items,
    opts.itemId,
    opts.kind,
    opts.newIndex,
  );
  await writeMixedIndexes(tx, reordered);
};

export const moveItemBetweenContainers = async (
  tx: PrismaTx,
  opts: {
    itemId: string;
    kind: MixedKind;
    from: { container: 'COURSE' | 'SEMESTER' | 'CHAPTER'; id: string };
    to: { container: 'COURSE' | 'SEMESTER' | 'CHAPTER'; id: string };
    newIndex: number;
    afterRemoveUpdate?: () => Promise<void>;
  },
) => {
  const load = async (
    container: 'COURSE' | 'SEMESTER' | 'CHAPTER',
    id: string,
  ) => {
    if (container === 'COURSE') return loadCourseLevelItems(tx, id);
    if (container === 'SEMESTER') return loadSemesterLevelItems(tx, id);
    return loadChapterLevelItems(tx, id);
  };

  const sameContainer =
    opts.from.container === opts.to.container && opts.from.id === opts.to.id;

  if (sameContainer) {
    await changeIndexInContainer(tx, {
      container: opts.from.container,
      containerId: opts.from.id,
      itemId: opts.itemId,
      kind: opts.kind,
      newIndex: opts.newIndex,
    });
    return;
  }

  const sourceItems = await load(opts.from.container, opts.from.id);
  const without = removeFromMixedList(sourceItems, opts.itemId, opts.kind);
  await writeMixedIndexes(tx, without);

  if (opts.afterRemoveUpdate) {
    await opts.afterRemoveUpdate();
  }

  const targetItems = await load(opts.to.container, opts.to.id);
  // After FK update, item may already appear in target load — filter it out first
  const targetClean = removeFromMixedList(targetItems, opts.itemId, opts.kind);
  const inserted = insertIntoMixedList(
    targetClean,
    { kind: opts.kind, id: opts.itemId, index: opts.newIndex },
    opts.newIndex,
  );
  await writeMixedIndexes(tx, inserted);
};
