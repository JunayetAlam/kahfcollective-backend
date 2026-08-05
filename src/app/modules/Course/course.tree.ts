import { ContentStatusEnum, CourseContentTypeEnum } from '@prisma/client';

export type ContentNode = {
  id: string;
  type: CourseContentTypeEnum;
  title: string;
  description: string;
  status: ContentStatusEnum;
  index: number;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  text?: string | null;
  meetingLink?: string | null;
  videoLink?: string | null;
  semesterId?: string | null;
  chapterId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  courseQuestions?: unknown;
};

export type ChapterTreeNode = {
  nodeType: 'CHAPTER';
  id: string;
  name: string;
  index: number;
  semesterId: string;
  courseId: string;
  contents: ContentNode[];
};

export type ContentTreeNode = {
  nodeType: 'CONTENT';
} & ContentNode;

export type SemesterTreeNode = {
  nodeType: 'SEMESTER';
  id: string;
  name: string;
  index: number;
  courseId: string;
  items: Array<ChapterTreeNode | ContentTreeNode>;
};

export type CourseTreeItem = SemesterTreeNode | ContentTreeNode;

const contentSelectFields = {
  id: true,
  type: true,
  title: true,
  description: true,
  status: true,
  index: true,
  videoUrl: true,
  pdfUrl: true,
  text: true,
  meetingLink: true,
  videoLink: true,
  semesterId: true,
  chapterId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const courseTreeInclude = {
  semesters: {
    where: { isDeleted: false },
    orderBy: { index: 'asc' as const },
    include: {
      chapters: {
        where: { isDeleted: false },
        orderBy: { index: 'asc' as const },
      },
    },
  },
  courseContents: {
    where: { isDeleted: false },
    select: {
      ...contentSelectFields,
      courseQuestions: true,
    },
    orderBy: { index: 'asc' as const },
  },
};

export const buildCourseTree = (course: {
  id: string;
  semesters: Array<{
    id: string;
    name: string;
    index: number;
    courseId: string;
    chapters: Array<{
      id: string;
      name: string;
      index: number;
      semesterId: string;
      courseId: string;
    }>;
  }>;
  courseContents: ContentNode[];
}): CourseTreeItem[] => {
  const chapterContents = new Map<string, ContentNode[]>();
  const semesterScopedContents = new Map<string, ContentNode[]>();
  const courseScopedContents: ContentNode[] = [];

  for (const content of course.courseContents) {
    if (content.chapterId) {
      const list = chapterContents.get(content.chapterId) ?? [];
      list.push(content);
      chapterContents.set(content.chapterId, list);
    } else if (content.semesterId) {
      const list = semesterScopedContents.get(content.semesterId) ?? [];
      list.push(content);
      semesterScopedContents.set(content.semesterId, list);
    } else {
      courseScopedContents.push(content);
    }
  }

  const semesterNodes: SemesterTreeNode[] = course.semesters.map(semester => {
    const chapterNodes: ChapterTreeNode[] = semester.chapters.map(chapter => ({
      nodeType: 'CHAPTER',
      id: chapter.id,
      name: chapter.name,
      index: chapter.index,
      semesterId: chapter.semesterId,
      courseId: chapter.courseId,
      contents: (chapterContents.get(chapter.id) ?? []).sort(
        (a, b) => a.index - b.index,
      ),
    }));

    const contentNodes: ContentTreeNode[] = (
      semesterScopedContents.get(semester.id) ?? []
    ).map(c => ({
      nodeType: 'CONTENT' as const,
      ...c,
    }));

    const items: Array<ChapterTreeNode | ContentTreeNode> = [
      ...chapterNodes,
      ...contentNodes,
    ].sort((a, b) => a.index - b.index);

    return {
      nodeType: 'SEMESTER',
      id: semester.id,
      name: semester.name,
      index: semester.index,
      courseId: semester.courseId,
      items,
    };
  });

  const courseContentNodes: ContentTreeNode[] = courseScopedContents.map(c => ({
    nodeType: 'CONTENT' as const,
    ...c,
  }));

  return [...semesterNodes, ...courseContentNodes].sort(
    (a, b) => a.index - b.index,
  );
};
