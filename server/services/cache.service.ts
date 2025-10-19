import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 90 * 24 * 60 * 60,
  checkperiod: 120,
});

export const cacheService = {
  get: <T>(key: string): T | undefined => {
    return cache.get<T>(key);
  },

  set: <T>(key: string, value: T, ttl?: number): boolean => {
    return cache.set(key, value, ttl || 90 * 24 * 60 * 60);
  },

  del: (key: string): number => {
    return cache.del(key);
  },

  flush: (): void => {
    cache.flushAll();
  },

  getStats: () => {
    return cache.getStats();
  },
};
