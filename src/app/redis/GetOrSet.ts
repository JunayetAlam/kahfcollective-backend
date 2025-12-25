import { redis } from './redis';

type ValueType = {
  key: string;
  ttl?: number;
  query: Promise<any>;
  newData?: boolean;
};
type CollectionType = {
  key: string;
  ttl?: number;
  query: Promise<any>;
  newData?: boolean;
  singleDataKey: string;
};

export async function getOrSet({ key, ttl = 60, newData, query }: ValueType) {
  const client = redis;
  if (newData) {
    const result = await query;
    await client.set(key, JSON.stringify(result), {
      expiration: {
        type: 'EX',
        value: ttl,
      },
    });
    return result;
  } else {
    const result = await client.get(key);
    if (result) {
      return JSON.parse(result);
    } else {
      const result = await query;
      await client.set(key, JSON.stringify(result), {
        expiration: {
          type: 'EX',
          value: ttl,
        },
      });
      return result;
    }
  }
}

export async function set({
  key,
  ttl = 60,
  data,
}: {
  key: string;
  ttl?: number;
  data: any;
}) {
  const client = redis;
  await client.set(key, JSON.stringify(data), {
    expiration: {
      type: 'EX',
      value: ttl,
    },
  });
}
export async function get({ key }: { key: string }) {
  const client = redis;
  const result = await client.get(key);
  if (result) {
    return JSON.parse(result);
  } else {
    return null;
  }
}

export async function getMany(keys: string[]) {
  const client = redis;
  const result = await client.mGet(keys);
  const rawData = Array.isArray(result) ? result : [];
  const getData = rawData
    .filter((item): item is string => item !== null)
    .map(item => JSON.parse(item));
  return keys.map(key => ({
    key,
    data: getData.find(item => item.id === key.split('-')[1]),
  }));
}

export const GetOrSetCollection = async ({
  key,
  ttl = 60,
  newData,
  query,
  singleDataKey,
}: CollectionType) => {
  const client = redis;
  if (newData) {
    return await setData({ query, key, ttl, singleDataKey });
  } else {
    const isDataExist = await client.get(key);
    if (isDataExist) {
      const parseData: {
        ids: string[];
        meta: any;
      } = JSON.parse(isDataExist);
      const idArrayForQuery = parseData.ids.map(
        item => `${singleDataKey}-${item}-details`,
      );
      const comingData = await client.mGet(idArrayForQuery);
      const rawData = Array.isArray(comingData) ? comingData : [];
      const getData = rawData
        .filter((item): item is string => item !== null)
        .map(item => JSON.parse(item));

      return { data: getData, meta: parseData.meta };
    } else {
      return await setData({ query, key, ttl, singleDataKey });
    }
  }
};

const setData = async ({
  query,
  key,
  ttl,
  singleDataKey,
}: {
  query: Promise<{ data: any[]; meta: any }>;

  key: string;
  ttl: number;
  singleDataKey: string;
}) => {
  const client = redis;
  const result: { data: any[]; meta: any } = await query;
  const ids = result.data.map(item => item.id);
  await client.set(key, JSON.stringify({ ids, meta: result.meta }), {
    expiration: {
      type: 'EX',
      value: ttl,
    },
  });
  result.data.forEach(async item => {
    await client.set(
      `${singleDataKey}-${item.id}-details`,
      JSON.stringify(item),
      {
        expiration: {
          type: 'EX',
          value: ttl,
        },
      },
    );
  });
  return result;
};
