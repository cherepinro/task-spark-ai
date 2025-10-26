import NodeCache from 'node-cache';

// Reduced from 90 days to 7 days for better memory management
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days
const MAX_CACHE_KEYS = 10000; // Prevent unbounded growth

const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 120,
  maxKeys: MAX_CACHE_KEYS,
});

export const cacheService = {
  get: <T>(key: string): T | undefined => {
    return cache.get<T>(key);
  },

  set: <T>(key: string, value: T, ttl?: number): boolean => {
    return cache.set(key, value, ttl || DEFAULT_TTL);
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

  // Memory monitoring and management
  getMemoryUsage: () => {
    const stats = cache.getStats();
    const keys = cache.keys();
    const keyCount = keys.length;
    
    return {
      keyCount,
      maxKeys: MAX_CACHE_KEYS,
      utilizationPercent: (keyCount / MAX_CACHE_KEYS) * 100,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      ksize: stats.ksize,
      vsize: stats.vsize,
    };
  },

  // Get cache health status
  getHealthStatus: () => {
    const usage = cacheService.getMemoryUsage();
    
    let status: 'healthy' | 'warning' | 'critical';
    if (usage.utilizationPercent < 70) {
      status = 'healthy';
    } else if (usage.utilizationPercent < 90) {
      status = 'warning';
    } else {
      status = 'critical';
    }
    
    return {
      status,
      message: status === 'healthy' 
        ? 'Cache is operating normally'
        : status === 'warning'
        ? 'Cache utilization is high, consider clearing old entries'
        : 'Cache is near capacity, immediate action required',
      ...usage,
    };
  },

  // Prune old or least-used entries (manual trigger)
  pruneCache: (): number => {
    const stats = cache.getStats();
    const keys = cache.keys();
    
    // If we're over 80% capacity, this is a signal to clean up
    if (keys.length > MAX_CACHE_KEYS * 0.8) {
      // Force cache to check for expired items
      cache.flushStats();
      return keys.length - cache.keys().length;
    }
    
    return 0;
  },
};
