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

  del: (key: string | string[]): number => {
    return cache.del(key);
  },

  flush: (): void => {
    cache.flushAll();
  },

  keys: (): string[] => {
    return cache.keys();
  },

  deleteByPattern: (pattern: RegExp): number => {
    const allKeys = cache.keys();
    const matchingKeys = allKeys.filter(key => pattern.test(key));
    return matchingKeys.length > 0 ? cache.del(matchingKeys) : 0;
  },

  getStats: () => {
    return cache.getStats();
  },
};
