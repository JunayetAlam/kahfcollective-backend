import { createClient } from 'redis';

export const redis = createClient({
  url: 'redis://127.0.0.1:6379',
});
