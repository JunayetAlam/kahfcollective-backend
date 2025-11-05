import { Post, Reply, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { toggleDelete } from '../../utils/toggleDelete';
import { checkForumAndTierEnrolled } from '../../utils/checkForumAndTierEnrolled';


const createPost = async (userId: string, forumId: string, payload: Pick<Post, 'message'>, role: UserRoleEnum) => {
    // Check forum membership only for regular users
    await checkForumAndTierEnrolled(userId, forumId, role);

    return await prisma.post.create({
        data: {
            message: payload.message,
            forumId,
            userId,
        }
    });
};

const replyToPost = async (userId: string, postId: string, payload: Pick<Reply, 'message'>, role: UserRoleEnum) => {
    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isPublished: true
        },
        select: {
            id: true,
            forumId: true
        }
    });

    if (!post) {
        throw new AppError(httpStatus.NOT_FOUND, 'Post Not Found');
    }

    await checkForumAndTierEnrolled(userId, post.forumId, role)

    return await prisma.reply.create({
        data: {
            forumId: post.forumId,
            message: payload.message,
            postId,
            userId
        }
    });


};

const deleteReply = async (userId: string, userRole: UserRoleEnum, replyId: string) => {
    if (userRole !== 'USER') {
        return await prisma.reply.update({
            where: {
                id: replyId
            },
            data: {
                isDeleted: true
            }
        })
    }
}

const replyToReply = async (userId: string, parentReplyId: string, payload: Pick<Reply, 'message'>, role: UserRoleEnum) => {
    // Check if parent reply exists
    const parentReply = await prisma.reply.findUnique({
        where: {
            id: parentReplyId,
            isDeleted: false
        },
        select: {
            id: true,
            postId: true,
            forumId: true,
            userId: true
        }
    });

    if (!parentReply) {
        throw new AppError(httpStatus.NOT_FOUND, 'Parent Reply Not Found');
    }
    await checkForumAndTierEnrolled(userId, parentReply.forumId, role)

    return await prisma.reply.create({
        data: {
            forumId: parentReply.forumId,
            message: payload.message,
            postId: parentReply.postId,
            parentReplyId: parentReplyId,
        }
    });
};

const giveReact = async (userId: string, postId: string, role: UserRoleEnum) => {
    // Check if post exists
    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isDeleted: false,
            isPublished: true
        },
        select: {
            id: true,
            forumId: true
        }
    });

    if (!post) {
        throw new AppError(httpStatus.NOT_FOUND, 'Post Not Found');
    }
    await checkForumAndTierEnrolled(userId, post.forumId, role)
    const existingReact = await prisma.react.findUnique({
        where: {
            postId_userId: {
                postId,
                userId
            }
        }
    });

    if (existingReact) {
        // Remove react (toggle functionality)
        return await prisma.react.update({
            where: {
                id: existingReact.id
            },
            data: {
                isDeleted: !existingReact.isDeleted
            }
        });
    } else {
        // Add react
        return await prisma.react.create({
            data: {
                postId: postId,
                userId
            }
        });
    }

};

const getAllPostForSpecificForum = async (forumId: string, query: any, role: UserRoleEnum, userId: string) => {
    // Check if forum exists
    const forum = await prisma.forum.findUnique({
        where: {
            id: forumId
        },
        select: {
            id: true
        }
    });

    if (!forum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum Not Found');
    }

    query.isDeleted = false;
    query.forumId = forumId;
    if (role === 'USER') {
        query.isPublished = true
    }

    const postsQuery = new QueryBuilder(
        prisma.post,
        query
    );

    const result = await postsQuery
        .filter()
        .search(['message'])
        .sort()
        .paginate()
        .customFields({
            id: true,
            message: true,
            createdAt: true,
            updatedAt: true,
            isPublished: true,
            _count: {
                select: {
                    reacts: {
                        where: {
                            isDeleted: false
                        }
                    },
                    replies: {
                        where: {
                            isDeleted: false,
                        }
                    }
                }
            },
            user: {
                select: {
                    id: true,
                    fullName: true,
                    profile: true
                }
            },
            reacts: {
                where: {
                    userId,
                    isDeleted: false
                }
            }
        })
        .execute();
    return result;
};
const getAllPost = async (query: any) => {

    query.isDeleted = false;

    const postsQuery = new QueryBuilder(
        prisma.post,
        query
    );
    const result = await postsQuery
        .filter()
        .search(['message'])
        .sort()
        .paginate()
        .customFields({
            id: true,
            message: true,
            createdAt: true,
            updatedAt: true,
            isPublished: true,
            _count: {
                select: {
                    reacts: {
                        where: {
                            isDeleted: false
                        }
                    },
                    replies: {
                        where: {
                            isDeleted: false,
                        }
                    }
                }
            },
            user: {
                select: {
                    id: true,
                    fullName: true,
                    profile: true
                }
            }
        })
        .execute();

    return result;
};

const getAllReplyForSpecificPost = async (postId: string, query: any) => {
    // Check if post exists
    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isDeleted: false,
            isPublished: true
        },
        select: {
            id: true
        }
    });

    if (!post) {
        throw new AppError(httpStatus.NOT_FOUND, 'Post Not Found');
    }

    query.isDeleted = false;
    query.postId = postId;

    const repliesQuery = new QueryBuilder(
        prisma.reply,
        query
    );

    const result = await repliesQuery
        .filter()
        .sort()
        .paginate()
        .search(['message'])
        .customFields({
            id: true,
            message: true,
            createdAt: true,
            updatedAt: true,
            parentReplyId: true,
            userId: true,
            user: {
                select: {
                    fullName: true,
                    profile: true,
                    gender: true,
                }
            }
        })
        .execute();

    return result;
};

const getAllReactForPost = async (postId: string, query: any,) => {
    // Check if post exists
    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            isDeleted: false,
            isPublished: true
        },
        select: {
            id: true
        }
    });

    if (!post) {
        throw new AppError(httpStatus.NOT_FOUND, 'Post Not Found');
    }

    query.postId = postId;
    query.isDeleted = false;

    const reactsQuery = new QueryBuilder(
        prisma.react,
        query
    );

    const result = await reactsQuery
        .filter()
        .sort()
        .paginate()
        .customFields({
            id: true,
            updatedAt: true,
            user: {
                select: {
                    id: true,
                    fullName: true,
                    profile: true
                }
            }
        })
        .execute();

    return result;
};

const togglePublish = async (postId: string) => {
    const result = await prisma.$runCommandRaw({
        update: "posts",
        updates: [
            {
                q: { _id: { $oid: postId } },
                u: [{ $set: { isPublished: { $not: "$isPublished" } } }],
            },
        ],
        ordered: true,
    });
    return result
}

const toggleDeletePost = async (id: string) => {

    const result = await toggleDelete(id, 'posts',)
    return result
};


export const PostService = {
    createPost,
    replyToPost,
    replyToReply,
    giveReact,
    getAllPostForSpecificForum,
    getAllReplyForSpecificPost,
    getAllReactForPost,
    togglePublish,
    getAllPost,
    toggleDeletePost,
    deleteReply
};