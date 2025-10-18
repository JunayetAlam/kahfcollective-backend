import { QuizAnswers } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
//isQuiz exist, isContentExist, isCourse enrolled, isPreviousAnswerDone, isQuizAnswerLocked,  
const ansQuiz = async (userId: string, payload: QuizAnswers) => {

    const isQuizExist = await prisma.quiz.findUnique({
        where: {
            id: payload.quizId,
            isDeleted: false,
        },
        select: {
            courseContent: {
                select: {
                    course: {
                        select: {
                            id: true,
                        }
                    },

                }
            },
            id: true,
            index: true,
            rightAnswer: true,
            type: true,
        }
    });
    if (!isQuizExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz Not Found')
    }
    if (!isQuizExist.courseContent) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course Content Not Found')
    };
    if (!isQuizExist.courseContent.course) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course Not Found')
    };

    if (isQuizExist.index > 1) {
        const isPreviousAnswers = await prisma.quizAnswers.findFirst({
            where: {
                isDeleted: false,
                userId,
                quiz: {
                    index: isQuizExist.index - 1
                },

            }
        });
        if (!isPreviousAnswers) {
            throw new AppError(httpStatus.BAD_REQUEST, 'Please answer the previous question')
        }
    }

    const isPreviouslyAnswer = await prisma.quizAnswers.findFirst({
        where: {
            quizId: payload.quizId,
            userId: userId
        },
        select: {
            id: true,
            isLocked: true,
        }
    });
    if (isPreviouslyAnswer) {
        if (isPreviouslyAnswer.isLocked === true) {
            throw new AppError(httpStatus.BAD_REQUEST, 'Answer Locked')
        }
        return await prisma.quizAnswers.update({
            where: {
                quizId_userId: {
                    userId,
                    quizId: payload.quizId,

                }

            },
            data: {
                answer: payload.answer,
            },
            select: {
                id: true,
                answer: true,
            }
        });
    }


    return await prisma.quizAnswers.create({
        data: {
            answer: payload.answer,
            quizId: payload.quizId,
            userId,
        },
        select: {
            id: true,
            answer: true,

        }
    })
};

const LockQuiz = async (userId: string, contentId: string) => {
    const content = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            isDeleted: false,
            type: 'QUIZ'
        },
        select: {
            quizzes: {
                where: {
                    isDeleted: false,
                },
                select: {
                    id: true,
                    index: true,
                    question: true,
                    rightAnswer: true,
                }
            }
        }
    });
    if (!content) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz Content not found')
    }

    const quizzesIds = content.quizzes.map(item => item.id);
    const getAllQuizzesAnswerForTheIds = await prisma.quizAnswers.findMany({
        where: {
            quizId: {
                in: quizzesIds
            },
            userId: userId,
        },
        select: {
            id: true,
            answer: true,
            quizId: true,
        }
    });

    const answeredQuizIds = getAllQuizzesAnswerForTheIds.map(a => a.quizId);
    const unansweredQuizzes = content.quizzes.filter(q => !answeredQuizIds.includes(q.id));

    if (unansweredQuizzes.length > 0) {
        const firstUnanswered = unansweredQuizzes[0];
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `You have not answered quiz #${firstUnanswered.index}: "${firstUnanswered.question}".`
        );
    }

    const lockAllAnswer = await prisma.quizAnswers.updateMany({
        where: {
            id: {
                in: getAllQuizzesAnswerForTheIds.map(item => item.id)
            },

        },
        data: {
            isLocked: true
        }
    })

    return lockAllAnswer
}

const getResultOfAQuizContents = async (userId: string, contentId: string) => {
    // Fetch quiz content
    const content = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            isDeleted: false,
            type: 'QUIZ',
        },
        select: {
            quizzes: {
                where: { isDeleted: false },
                select: { id: true, index: true, question: true, rightAnswer: true, type: true },
                orderBy: { index: 'asc' }
            }
        }
    });

    if (!content) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz Content not found');
    }

    // Fetch user's answers for this content
    const userAnswers = await prisma.quizAnswers.findMany({
        where: {
            userId,
            quizId: {
                in: content.quizzes.map(q => q.id)
            }
        },
        select: {
            quizId: true,
            answer: true,
            isRight: true,
            isLocked: true,
            id: true,
            isMarked: true
        }
    });

    const notAnsweredQues = userAnswers.find(item => item.isLocked === false);
    if (content.quizzes.length !== userAnswers.length || notAnsweredQues) {
        return { isAllAnswered: false }
    }
    const isAllMarked = !userAnswers.find(item => item.isMarked !== true);



    const result = {
        isAllAnswered: true,
        isAllMarked: !!isAllMarked,
        ...(isAllMarked && {
            total: content.quizzes.length,
            correct: userAnswers.filter(a => a.isRight).length,
            incorrect: userAnswers.filter(a => !a.isRight).length,
        }),
        answers: content.quizzes.map(q => {
            const userAns = userAnswers.find(a => a.quizId === q.id);
            return {
                quizId: q.id,
                index: q.index,
                answerId: userAns?.id || null,
                question: q.question,
                userAnswer: userAns?.answer || null,
                type: q.type,
                isLocked: userAns?.isLocked || false,

                ...(isAllMarked && {
                    correctAnswer: userAns?.isLocked ? q.rightAnswer : undefined,
                    isRight: userAns?.isRight || false,
                })
            };
        })
    };

    return result;
};

const getSingleQuizWithUserAnswer = async (userId: string, quizId: string) => {
    const quizAnswers = await prisma.quizAnswers.findUnique({
        where: {
            quizId_userId: {
                quizId,
                userId,
            }

        },
        select: {
            id: true,
            isLocked: true,
            isRight: true,
            answer: true,
            isMarked: true,
            quizId: true,
            quiz: {
                select: {
                    rightAnswer: true
                }
            }
        }
    });
    if (!quizAnswers) {
        return {}
    }

    return {
        id: quizAnswers?.id,
        answer: quizAnswers?.answer,
        quizId: quizAnswers?.quizId,
        isLocked: quizAnswers?.isLocked,
        isMarked: quizAnswers?.isMarked || false,
        ...(quizAnswers?.isLocked && quizAnswers.isMarked && {
            isRight: quizAnswers.isRight,
            rightAnswer: quizAnswers.quiz.rightAnswer
        })
    }

};

const markQuizAnswer = async (id: string, isRight: boolean) => {
    return await prisma.quizAnswers.update({
        where: {
            id,
            isLocked: true
        },
        data: {
            isRight: isRight,
            isMarked: true
        }
    })
}

const getAllQuizAnswersGrouped = async (page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    // Use aggregation pipeline for efficient grouping and pagination
    const pipeline = [
        // Match non-deleted records
        {
            $match: {
                isDeleted: false,
            }
        },
        // Lookup user data
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $match: {
                'user.isDeleted': { $ne: true }
            }
        },
        // Lookup quiz data
        {
            $lookup: {
                from: 'quizzes',
                localField: 'quizId',
                foreignField: '_id',
                as: 'quiz'
            }
        },
        {
            $unwind: '$quiz'
        },
        // Lookup course content
        {
            $lookup: {
                from: 'course_contents',
                localField: 'quiz.courseContentId',
                foreignField: '_id',
                as: 'courseContent'
            }
        },
        {
            $unwind: '$courseContent'
        },
        // Lookup course
        {
            $lookup: {
                from: 'courses',
                localField: 'courseContent.courseId',
                foreignField: '_id',
                as: 'course'
            }
        },
        {
            $unwind: '$course'
        },
        // Group by userId and courseContentId
        {
            $group: {
                _id: {
                    userId: '$userId',
                    courseContentId: '$quiz.courseContentId'
                },
                userId: { $first: '$userId' },
                userName: { $first: '$user.fullName' },
                userProfile: { $first: '$user.profile' },
                courseContentId: { $first: '$quiz.courseContentId' },
                courseContentTitle: { $first: '$courseContent.title' },
                courseId: { $first: '$course._id' },
                courseTitle: { $first: '$course.title' },
                quizId: { $first: '$quizId' },
                totalAnswers: { $sum: 1 },
                correctAnswers: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$isMarked', true] },
                                    { $eq: ['$isRight', true] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                notMarkedCount: {
                    $sum: {
                        $cond: [
                            {
                                $or: [
                                    { $eq: ['$isMarked', false] },
                                    { $eq: ['$isMarked', null] },
                                    { $eq: [{ $type: '$isMarked' }, 'missing'] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                answers: {
                    $push: {
                        id: '$_id',
                        answer: '$answer',
                        isRight: '$isRight',
                        isMarked: '$isMarked',
                        isLocked: '$isLocked'
                    }
                }
            }
        },
        // Add computed fields
        {
            $addFields: {
                groupKey: {
                    $concat: [
                        { $toString: '$userId' },
                        '_',
                        { $toString: '$courseContentId' }
                    ]
                },
                mark: {
                    $cond: [
                        { $gt: ['$notMarkedCount', 0] },
                        'Not Marked All',
                        {
                            $multiply: [
                                { $divide: ['$correctAnswers', '$totalAnswers'] },
                                100
                            ]
                        }
                    ]
                },
                correctAnswersDisplay: {
                    $cond: [
                        { $gt: ['$notMarkedCount', 0] },
                        'Not Marked All',
                        '$correctAnswers'
                    ]
                }
            }
        },
        // Sort for consistent pagination
        {
            $sort: {
                userId: 1,
                courseContentId: 1
            }
        },
        // Facet for pagination and total count
        {
            $facet: {
                metadata: [
                    { $count: 'total' }
                ],
                data: [
                    { $skip: skip },
                    { $limit: limit }
                ]
            }
        }
    ];

    const result = await prisma.quizAnswers.aggregateRaw({
        pipeline
    }) as any;

    const total = result[0]?.metadata[0]?.total || 0;
    const groups = result[0]?.data || [];

    // Format the response
    const formattedGroups = groups.map((group: any) => ({
        groupKey: group.groupKey,
        userId: group.userId.$oid,
        quizId: group.quizId.$oid,
        courseId: group.courseId.$oid,
        userName: group.userName,
        userProfile: group.userProfile,
        courseContentId: group.courseContentId.$oid,
        courseContentTitle: group.courseContentTitle,
        courseTitle: group.courseTitle,
        mark: group.mark,
        totalAnswers: group.totalAnswers,
        correctAnswers: group.correctAnswersDisplay
    }));
    return {
        data: formattedGroups,
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit)
        }
    };
};

const getResultOfAQuizContentsInstructor = async (userId: string, contentId: string) => {
    // Fetch quiz content
    const content = await prisma.courseContents.findUnique({
        where: {
            id: contentId,
            isDeleted: false,
            type: 'QUIZ',
        },
        select: {
            quizzes: {
                where: { isDeleted: false },
                select: { id: true, index: true, question: true, rightAnswer: true, type: true, options: true },
                orderBy: { index: 'asc' }
            }
        }
    });

    if (!content) {
        throw new AppError(httpStatus.NOT_FOUND, 'Quiz Content not found');
    }

    // Fetch user's answers for this content
    const userAnswers = await prisma.quizAnswers.findMany({
        where: {
            userId,
            quizId: {
                in: content.quizzes.map(q => q.id)
            }
        },
        select: {
            quizId: true,
            answer: true,
            isRight: true,
            isLocked: true,
            id: true,
            isMarked: true
        }
    });

    const notAnsweredQues = userAnswers.find(item => item.isLocked === false);
    const allNotAnswered = content.quizzes.length !== userAnswers.length || notAnsweredQues
    const isAllMarked = !userAnswers.find(item => item.isMarked !== true);


    const total = content.quizzes.length;
    const correct = userAnswers.filter(a => a.isRight).length;
    const incorrect = userAnswers.filter(a => !a.isRight).length;
    const markPercent = total > 0 ? (correct / total) * 100 : 0;
    const result = {
        isAllAnswered: !allNotAnswered,
        isAllMarked: !!isAllMarked,
        total,
        correct,
        incorrect,
        markPercent,
        answers: content.quizzes.map(q => {
            const userAns = userAnswers.find(a => a.quizId === q.id);
            return {
                quizId: q.id,
                index: q.index,
                isAnswered: !!userAns,
                answerId: userAns?.id || null,
                question: q.question,
                userAnswer: userAns?.answer || null,
                type: q.type,
                isLocked: userAns?.isLocked || false,
                correctAnswer: q.rightAnswer,
                isRight: typeof userAns?.isRight === 'boolean' ? userAns?.isRight : null,
                options: q.options,
            };
        })
    };
    return result;
};

export const QuizAnswerService = {
    ansQuiz,
    LockQuiz,
    getResultOfAQuizContents,
    getSingleQuizWithUserAnswer,
    markQuizAnswer,
    getAllQuizAnswersGrouped,
    getResultOfAQuizContentsInstructor
};
