import { redis } from './redis';

export const removeData = async (key: string) => {
  const client = redis;
  await client.del(key);
};

export const removeDataByPattern = async (pattern: string) => {
  const client = redis;
  let cursor = '0';

  do {
    const { cursor: nextCursor, keys } = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = nextCursor;

    if (keys.length > 0) {
      await client.del(keys);
    }
  } while (cursor !== '0');
};

export const updateData = async (
  pattern: string,
  values: Record<string, any>,
  ttl = 60,
) => {
  const client = redis;
  let cursor = '0';
  let updated = 0;

  do {
    const { cursor: nextCursor, keys } = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });
    cursor = nextCursor;
    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        const redisData = JSON.parse(data);
        await client.set(key, JSON.stringify({ ...redisData, ...values }), {
          expiration: {
            type: 'EX',
            value: ttl,
          },
        });
        updated += 1;
      }
    }
  } while (cursor !== '0');
  return updated;
};
