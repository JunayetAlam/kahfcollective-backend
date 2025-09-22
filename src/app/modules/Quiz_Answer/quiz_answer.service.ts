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
                rightAnswer: isQuizExist.rightAnswer,
                isRight: payload.answer === isQuizExist.rightAnswer
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
            rightAnswer: isQuizExist.rightAnswer,
            isRight: payload.answer === isQuizExist.rightAnswer
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
                    rightAnswer: true
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
                select: { id: true, index: true, question: true, rightAnswer: true },
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
            id: true
        }
    });

    const notAnsweredQues = userAnswers.find(item => item.isLocked === false);
    if (content.quizzes.length !== userAnswers.length || notAnsweredQues) {
        return { isAllAnswered: false }
    }

    const result = {
        isAllAnswered: true,
        total: content.quizzes.length,
        correct: userAnswers.filter(a => a.isRight).length,
        incorrect: userAnswers.filter(a => !a.isRight).length,
        answers: content.quizzes.map(q => {
            const userAns = userAnswers.find(a => a.quizId === q.id);
            return {
                quizId: q.id,
                index: q.index,
                answerId: userAns?.id || null,
                question: q.question,
                userAnswer: userAns?.answer || null,
                isRight: userAns?.isRight || false,
                isLocked: userAns?.isLocked || false,
                correctAnswer: userAns?.isLocked ? q.rightAnswer : undefined
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
            rightAnswer: true,
            answer: true,
            quizId: true,
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
        ...(quizAnswers?.isLocked && {
            isRight: quizAnswers.isRight,
            rightAnswer: quizAnswers.rightAnswer
        })
    }

};



export const QuizAnswerService = {
    ansQuiz,
    LockQuiz,
    getResultOfAQuizContents,
    getSingleQuizWithUserAnswer
};
