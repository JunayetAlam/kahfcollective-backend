import { createClient, RedisClientType } from 'redis';
import config from '../../config';

export const isRedisEnabled = config.redis.enabled;

export const redis: RedisClientType | null = isRedisEnabled
  ? createClient({
      url: `redis://${config.redis.host}:${config.redis.port}`,
      ...(config.redis.password
        ? { password: config.redis.password }
        : {}),
    })
  : null;
