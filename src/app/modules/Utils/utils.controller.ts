import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { invalidateRedis } from '../../redis/redis.utils';

const invalidateFullRedis = catchAsync(async (req, res) => {
    const result = await invalidateRedis();

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        message: 'Redis invalidated successfully',
        data: result,
    });
});

export const UtilsController = { invalidateFullRedis };
