import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import { CourseContents, Quiz, UserRoleEnum } from '@prisma/client';
import AppError from '../../errors/AppError';
import { deleteFromDigitalOceanAWS, uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import { toggleDelete } from '../../utils/toggleDelete';


const checkSuperAdmin = (role: UserRoleEnum, userId: string) => {
    if (role !== 'SUPERADMIN') {
        return {
            isDeleted: false,
            instructorId: userId
        }
    }
    else {
        return { isDeleted: false, }
    }
}

const createVideoContent = async (payload: Pick<CourseContents, 'courseId' | 'title' | 'description' | 'status'>, video: Express.Multer.File | undefined, userId: string, role: UserRoleEnum) => {
    if (!video) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide Video')
    }
    if (!video.mimetype.startsWith("video/")) {
        throw new AppError(httpStatus.BAD_REQUEST, "Only video files are allowed");
    }
    const isCourseExist = await prisma.course.findUnique({
        where: {
            id: payload.courseId,
            ...checkSuperAdmin(role, userId),

        }
    });
    if (!isCourseExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found')
    };

    // Get count for this specific course
    const count = await prisma.courseContents.count({
        where: {
            courseId: payload.courseId,
            isDeleted: false
        }
    });

    const { Location } = await uploadToDigitalOceanAWS(video);
    const result = await prisma.courseContents.create({
        data: {
            ...payload,
            type: 'VIDEO',
            index: count + 1,
            videoUrl: Location,
            instructorId: isCourseExist.instructorId
        }
    });
    return result

};

const updateVideo = async (userId: string, role: UserRoleEnum, contentId: string, video: Express.Multer.File | undefined) => {

    if (!video) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide Video')
    }
    if (!video.mimetype.startsWith("video/")) {
        throw new AppError(httpStatus.BAD_REQUEST, "Only video files are allowed");
    }

    const isContentExist = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            type: 'VIDEO',
            ...checkSuperAdmin(role, userId)
        }
    })
    if (!isContentExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Content Not found')
    }

    const { Location } = await uploadToDigitalOceanAWS(video);

    const result = await prisma.courseContents.update({
        where: {
            id: contentId
        },
        data: {
            videoUrl: Location
        }
    });
    await deleteFromDigitalOceanAWS(isContentExist.videoUrl || '')
    return result
}

const createQuizContent = async (payload: Pick<CourseContents, 'courseId' | 'title' | 'description' | 'status'> & { quizzes: Quiz[] }, userId: string, role: UserRoleEnum) => {

    const isCourseExist = await prisma.course.findUnique({
        where: {
            id: payload.courseId,
            ...checkSuperAdmin(role, userId),
        }
    });
    if (!isCourseExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found')
    };

    // Get count for this specific course
    const count = await prisma.courseContents.count({
        where: {
            courseId: payload.courseId,
            isDeleted: false
        }
    });

    const result = await prisma.courseContents.create({
        data: {
            title: payload.title,
            description: payload.description,
            status: payload.status,
            type: 'QUIZ',
            index: count + 1,
            courseId: payload.courseId,
            quizzes: {
                createMany: {
                    data: payload.quizzes.map((item, index) => ({ ...item, instructorId: userId, index: index + 1 }))
                }
            },
            instructorId: isCourseExist.instructorId

        }
    });
    return result
}

const updateContent = async (id: string, payload: Partial<Pick<CourseContents, 'description' | 'title' | 'status'>>, userId: string, role: UserRoleEnum) => {
    const result = await prisma.courseContents.update({
        where: {
            id,
            ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId })

        },
        data: payload
    });
    return result;
}

const toggleDeleteContent = async (id: string, userId: string, role: UserRoleEnum) => {
    const result = await toggleDelete(id, 'course_contents', role !== 'SUPERADMIN' ? { instructorId: { $oid: userId } } : {});
    return result
}

const createQuiz = async (payload: Quiz, userId: string, role: UserRoleEnum) => {
    const quizOptions = payload.options
    const values = Object.values(quizOptions);
    const hasDuplicates = new Set(values).size !== values.length;

    if (hasDuplicates) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Quiz options must all be different.')
    }
    const isCourseContentExist = await prisma.courseContents.findUnique({
        where: {
            id: payload.courseContentId,
            ...checkSuperAdmin(role, userId),
        }
    });
    if (!isCourseContentExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course Content not found')
    };

    // Get count for this specific course content
    const count = await prisma.quiz.count({
        where: {
            courseContentId: payload.courseContentId,
            isDeleted: false
        }
    });

    const result = await prisma.quiz.create({
        data: {
            index: count + 1,
            options: payload.options,
            question: payload.question,
            rightAnswer: payload.rightAnswer,
            courseContentId: payload.courseContentId,
            instructorId: isCourseContentExist.instructorId,
        }
    });
    return result
};

const updateQuiz = async (
    id: string,
    payload: Partial<Pick<Quiz, 'question' | 'options' | 'rightAnswer'>>,
    userId: string,
    role: UserRoleEnum
) => {
    const quizOptions = payload?.options
    if (quizOptions) {
        const values = Object.values(quizOptions);
        const hasDuplicates = new Set(values).size !== values.length;

        if (hasDuplicates) {
            throw new AppError(httpStatus.BAD_REQUEST, 'Quiz options must all be different.')
        }
    }
    const result = await prisma.quiz.update({
        where: {
            id,
            ...(role !== 'SUPERADMIN' && { instructorId: userId, isDeleted: false })
        },
        data: payload
    });
    return result;
};

// 1. Get all content for a specific course (for owners/superadmins)
const getAllContentForSpecificCourse = async (courseId: string, userId: string, role: UserRoleEnum) => {



    const contents = await prisma.courseContents.findMany({
        where: {
            courseId,
            ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId }),
            ...(role !== 'USER' && {
            })
        },
        orderBy: {
            index: 'asc'
        },
    });

    return contents;
};

// 1a. Get all content for a specific course (for normal users)
const getAllContentForSpecificCourseForUser = async (courseId: string, userId: string) => {



    const contents = await prisma.courseContents.findMany({
        where: {
            courseId,
            isDeleted: false,
        },
        orderBy: {
            index: 'asc'
        },
    });
    return contents;
};


// 2. Get single content (for owners/superadmins)
const getSingleContent = async (contentId: string, userId: string, role: UserRoleEnum) => {


    const content = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId })
        },
        include: {
            quizzes: {
                where: {
                    ...(role !== 'SUPERADMIN' && { isDeleted: false })
                },
                orderBy: {
                    index: 'asc'
                }
            }
        }
    });

    if (!content) {
        throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
    }

    return content;
};

// 2a. Get single content (for normal users)
const getSingleContentForUser = async (contentId: string, userId: string) => {



    const content = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            isDeleted: false
        },
        include: {
            quizzes: {
                where: {
                    isDeleted: false
                },
                orderBy: {
                    index: 'asc'
                }
            }
        }
    });

    if (!content) {
        throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
    }

    return content;
};

// 3. Get all quiz for a specific course content (for owners/superadmins)
const getAllQuizForSpecificCourseContent = async (courseContentId: string, userId: string, role: UserRoleEnum) => {
    const isCourseContentExist = await prisma.courseContents.findUnique({
        where: {
            id: courseContentId,
            ...checkSuperAdmin(role, userId),
        },
    });

    if (!isCourseContentExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course Content not found');
    }

    const quizzes = await prisma.quiz.findMany({
        where: {
            courseContentId,
            ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId })
        },
        orderBy: {
            index: 'asc'
        },

    });

    return quizzes;
};

// 3a. Get all quiz for a specific course content (for normal users)
const getAllQuizForSpecificCourseContentForUser = async (courseContentId: string, userId: string) => {
    const isCourseContentExist = await prisma.courseContents.findUnique({
        where: {
            id: courseContentId,
            isDeleted: false
        }
    });

    if (!isCourseContentExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course Content not found');
    }

    const quizzes = await prisma.quiz.findMany({
        where: {
            courseContentId,
            isDeleted: false
        },
        orderBy: {
            index: 'asc'
        },
        omit: {
            rightAnswer: true,
            updatedAt: true
        }
    });

    return quizzes;
};

// 4. Get single quiz (for owners/superadmins)
const getSingleQuiz = async (quizId: string, userId: string, role: UserRoleEnum) => {
    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId,
            ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId })
        }
    });

    if (!quiz) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
    }

    return quiz;
};

// 4a. Get single quiz (for normal users)
const getSingleQuizForUser = async (quizId: string, userId: string) => {
    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId,
            isDeleted: false
        },
        omit: {
            rightAnswer: true
        },
        include: {
            courseContent: {
                select: {
                    courseId: true
                }
            }
        }
    });



    if (!quiz) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
    }

    return quiz;
};

// 5. Toggle delete quiz
const toggleDeleteQuiz = async (id: string, userId: string, role: UserRoleEnum) => {
    const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: { courseContent: true }
    });

    if (!quiz) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
    }

    if (role !== UserRoleEnum.SUPERADMIN && quiz.instructorId !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    if (quiz.isDeleted) {
        const lastQuiz = await prisma.quiz.findFirst({
            where: {
                courseContentId: quiz.courseContentId,
                isDeleted: false
            },
            orderBy: { index: 'desc' }
        });

        const newIndex = lastQuiz ? lastQuiz.index + 1 : 1;

        return await prisma.quiz.update({
            where: { id },
            data: {
                isDeleted: false,
                index: newIndex
            }
        });
    } else {
        return await prisma.$transaction(async (tx) => {
            await tx.quiz.update({
                where: { id },
                data: {
                    isDeleted: true,
                    index: 1000
                }
            });

            await tx.quiz.updateMany({
                where: {
                    courseContentId: quiz.courseContentId,
                    isDeleted: false,
                    index: {
                        gt: quiz.index
                    }
                },
                data: {
                    index: {
                        decrement: 1
                    }
                }
            });

            return await tx.quiz.findUnique({ where: { id } });
        });
    }
};

// 6. Change index for course content
const changeContentIndex = async (contentId: string, newIndex: number, userId: string, role: UserRoleEnum) => {
    // First, get the content to check if it exists and get its current index and courseId
    const content = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            isDeleted: false,
            ...(role !== 'SUPERADMIN' && { instructorId: userId })
        }
    });

    if (!content) {
        throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
    }

    const currentIndex = content.index;
    const courseId = content.courseId;

    // Get the total count of contents for this course
    const totalCount = await prisma.courseContents.count({
        where: {
            courseId,
            isDeleted: false
        }
    });

    // Validate new index
    if (newIndex < 1 || newIndex > totalCount) {
        throw new AppError(httpStatus.BAD_REQUEST, `Index must be between 1 and ${totalCount}`);
    }

    // If the index is the same, no need to update
    if (currentIndex === newIndex) {
        return content;
    }

    await prisma.$transaction(async (tx) => {
        if (currentIndex < newIndex) {
            // Moving down: decrease index of items between current and new position
            await tx.courseContents.updateMany({
                where: {
                    courseId,
                    isDeleted: false,
                    index: {
                        gt: currentIndex,
                        lte: newIndex
                    }
                },
                data: {
                    index: {
                        decrement: 1
                    }
                }
            });
        } else {
            // Moving up: increase index of items between new and current position
            await tx.courseContents.updateMany({
                where: {
                    courseId,
                    isDeleted: false,
                    index: {
                        gte: newIndex,
                        lt: currentIndex
                    }
                },
                data: {
                    index: {
                        increment: 1
                    }
                }
            });
        }

        // Update the target content's index
        await tx.courseContents.update({
            where: {
                id: contentId
            },
            data: {
                index: newIndex
            }
        });
    });

    return await prisma.courseContents.findUnique({
        where: { id: contentId }
    });
};

// 7. Change index for quiz
const changeQuizIndex = async (quizId: string, newIndex: number, userId: string, role: UserRoleEnum) => {
    // First, get the quiz to check if it exists and get its current index and courseContentId
    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId,
            isDeleted: false,
            ...(role !== 'SUPERADMIN' && { instructorId: userId })
        }
    });

    if (!quiz) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
    }

    const currentIndex = quiz.index;
    const courseContentId = quiz.courseContentId;

    // Get the total count of quizzes for this course content
    const totalCount = await prisma.quiz.count({
        where: {
            courseContentId,
            isDeleted: false
        }
    });

    // Validate new index
    if (newIndex < 1 || newIndex > totalCount) {
        throw new AppError(httpStatus.BAD_REQUEST, `Index must be between 1 and ${totalCount}`);
    }

    // If the index is the same, no need to update
    if (currentIndex === newIndex) {
        return quiz;
    }

    await prisma.$transaction(async (tx) => {
        if (currentIndex < newIndex) {
            // Moving down: decrease index of items between current and new position
            await tx.quiz.updateMany({
                where: {
                    courseContentId,
                    isDeleted: false,
                    index: {
                        gt: currentIndex,
                        lte: newIndex
                    }
                },
                data: {
                    index: {
                        decrement: 1
                    }
                }
            });
        } else {
            // Moving up: increase index of items between new and current position
            await tx.quiz.updateMany({
                where: {
                    courseContentId,
                    isDeleted: false,
                    index: {
                        gte: newIndex,
                        lt: currentIndex
                    }
                },
                data: {
                    index: {
                        increment: 1
                    }
                }
            });
        }

        // Update the target quiz's index
        await tx.quiz.update({
            where: {
                id: quizId
            },
            data: {
                index: newIndex
            }
        });
    });

    return await prisma.quiz.findUnique({
        where: { id: quizId }
    });
};

export const CoursecontentService = {
    createVideoContent,
    updateVideo,
    createQuizContent,
    updateContent,
    toggleDeleteContent,
    createQuiz,
    updateQuiz,
    // For owners/superadmins
    getAllContentForSpecificCourse,
    getSingleContent,
    getAllQuizForSpecificCourseContent,
    getSingleQuiz,
    // For normal users
    getAllContentForSpecificCourseForUser,
    getSingleContentForUser,
    getAllQuizForSpecificCourseContentForUser,
    getSingleQuizForUser,
    // Other methods
    toggleDeleteQuiz,
    changeContentIndex,
    changeQuizIndex,
};