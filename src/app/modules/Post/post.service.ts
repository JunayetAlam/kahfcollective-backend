import { Post, Reply, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { toggleDelete } from '../../utils/toggleDelete';

const needsValidation = (role: UserRoleEnum) => {
    return role === 'USER';
};

const checkForumMembership = async (userId: string, forumId: string, role: UserRoleEnum) => {
    if (!needsValidation(role)) {
        return;
    }

    const joinForum = await prisma.joinForum.findUnique({
        where: {
            userId_forumId: {
                userId,
                forumId
            },
            isLeave: false
        },
        select: {
            forum: {
                select: {
                    id: true
                }
            }
        }
    });

    if (!joinForum) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Please join Discussion First');
    }

    if (!joinForum.forum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum Not found');
    }
};

const createPost = async (userId: string, forumId: string, payload: Pick<Post, 'message'>, role: UserRoleEnum) => {
    // Check forum membership only for regular users
    await checkForumMembership(userId, forumId, role);

    return await prisma.post.create({
        data: {
            message: payload.message,
            forumId,
            userId,
        }
    });
};

const replyToPost = async (userId: string, postId: string, payload: Pick<Reply, 'message'>, role: UserRoleEnum) => {
    // Check if post exists
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

    let joinForumId = null;

    if (needsValidation(role)) {
        // For regular users, check forum membership
        const joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    userId,
                    forumId: post.forumId
                },
                isLeave: false
            },
        });

        if (!joinForum) {
            throw new AppError(httpStatus.BAD_REQUEST, 'Please join Discussion First');
        }

        joinForumId = joinForum.id;
    } else {
        // For INSTRUCTOR and SUPERADMIN, create or find joinForum entry if it doesn't exist
        let joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    userId,
                    forumId: post.forumId
                }
            },
        });

        if (!joinForum) {
            joinForum = await prisma.joinForum.create({
                data: {
                    userId,
                    forumId: post.forumId,
                    isLeave: false
                }
            });
        }

        joinForumId = joinForum.id;
    }

    return await prisma.reply.create({
        data: {
            forumId: post.forumId,
            message: payload.message,
            joinForumId,
            postId,
        }
    });
};

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
            forumId: true
        }
    });

    if (!parentReply) {
        throw new AppError(httpStatus.NOT_FOUND, 'Parent Reply Not Found');
    }

    let joinForumId = null;

    if (needsValidation(role)) {
        // For regular users, check forum membership
        const joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    userId,
                    forumId: parentReply.forumId
                },
                isLeave: false
            },
        });

        if (!joinForum) {
            throw new AppError(httpStatus.BAD_REQUEST, 'Please join Discussion First');
        }

        joinForumId = joinForum.id;
    } else {
        // For INSTRUCTOR and SUPERADMIN, create or find joinForum entry if it doesn't exist
        let joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    userId,
                    forumId: parentReply.forumId
                }
            },
        });

        if (!joinForum) {
            joinForum = await prisma.joinForum.create({
                data: {
                    userId,
                    forumId: parentReply.forumId,
                    isLeave: false
                }
            });
        }

        joinForumId = joinForum.id;
    }

    return await prisma.reply.create({
        data: {
            forumId: parentReply.forumId,
            message: payload.message,
            joinForumId,
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

    let joinForumId = null;

    if (needsValidation(role)) {
        // For regular users, check forum membership
        const joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    userId,
                    forumId: post.forumId
                },
                isLeave: false
            },
        });

        if (!joinForum) {
            throw new AppError(httpStatus.BAD_REQUEST, 'Please join Discussion First');
        }

        joinForumId = joinForum.id;
    } else {
        // For INSTRUCTOR and SUPERADMIN, create or find joinForum entry if it doesn't exist
        let joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    userId,
                    forumId: post.forumId
                }
            },
        });

        if (!joinForum) {
            joinForum = await prisma.joinForum.create({
                data: {
                    userId,
                    forumId: post.forumId,
                    isLeave: false
                }
            });
        }

        joinForumId = joinForum.id;
    }

    // Check if user already reacted to this post
    const existingReact = await prisma.react.findUnique({
        where: {
            joinForumId_postId: {
                joinForumId,
                postId
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
                joinForumId: joinForumId,
                postId: postId,
            }
        });
    }
};

const getAllPostForSpecificForum = async (forumId: string, query: any, role: UserRoleEnum) => {
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
            joinForum: {
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            profile: true
                        }
                    }
                }
            }
        })
        .execute();

    return result;
};

const getAllReactForPost = async (postId: string, query: any) => {
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
            joinForum: {
                select: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            profile: true
                        }
                    }
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
    toggleDeletePost
};