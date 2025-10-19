import { cacheService } from './cache.service';
import md5 from 'md5';

const CACHE_TTL = {
  TASKS: 5 * 60,        // 5 minutes
  PROJECTS: 30 * 60,    // 30 minutes  
  INSIGHTS: 15 * 60,    // 15 minutes
  TEMPLATES: 30 * 60,   // 30 minutes
};

// Define cache namespaces to prevent collisions
const CACHE_NAMESPACE = {
  DATA_TASKS: 'data:tasks',
  DATA_PROJECTS: 'data:projects',
  DATA_INSIGHTS: 'data:insights',
  DATA_TEMPLATES: 'data:templates',
  AI_DECOMPOSE: 'ai:decompose',
  AI_REORGANIZE: 'ai:reorganize',
  AI_DAY_PLAN: 'ai:dayplan',
} as const;

export interface TaskFilters {
  search?: string;
  priority?: string;
  status?: string;
  projectId?: string;
}

export const dataCacheService = {
  // Generate cache keys with proper namespacing
  generateTasksKey: (filters?: TaskFilters) => {
    const key = filters ? md5(JSON.stringify(filters)) : 'all';
    return `${CACHE_NAMESPACE.DATA_TASKS}:${key}`;
  },

  generateProjectsKey: () => `${CACHE_NAMESPACE.DATA_PROJECTS}:all`,
  
  generateInsightsKey: () => `${CACHE_NAMESPACE.DATA_INSIGHTS}:all`,
  
  generateTemplatesKey: () => `${CACHE_NAMESPACE.DATA_TEMPLATES}:all`,

  // Tasks caching
  getTasks: <T>(filters?: TaskFilters): T | undefined => {
    const key = dataCacheService.generateTasksKey(filters);
    return cacheService.get<T>(key);
  },

  setTasks: <T>(data: T, filters?: TaskFilters): boolean => {
    const key = dataCacheService.generateTasksKey(filters);
    return cacheService.set(key, data, CACHE_TTL.TASKS);
  },

  invalidateTasks: (): void => {
    // Selectively clear only task-related caches using pattern matching
    cacheService.deleteByPattern(new RegExp(`^${CACHE_NAMESPACE.DATA_TASKS}:`));
  },

  // Projects caching
  getProjects: <T>(): T | undefined => {
    return cacheService.get<T>(dataCacheService.generateProjectsKey());
  },

  setProjects: <T>(data: T): boolean => {
    return cacheService.set(dataCacheService.generateProjectsKey(), data, CACHE_TTL.PROJECTS);
  },

  invalidateProjects: (): void => {
    // Clear project caches and task caches (since tasks reference projects)
    cacheService.deleteByPattern(new RegExp(`^${CACHE_NAMESPACE.DATA_PROJECTS}:`));
    cacheService.deleteByPattern(new RegExp(`^${CACHE_NAMESPACE.DATA_TASKS}:`));
  },

  // Insights caching
  getInsights: <T>(): T | undefined => {
    return cacheService.get<T>(dataCacheService.generateInsightsKey());
  },

  setInsights: <T>(data: T): boolean => {
    return cacheService.set(dataCacheService.generateInsightsKey(), data, CACHE_TTL.INSIGHTS);
  },

  invalidateInsights: (): void => {
    // Clear insights cache
    cacheService.del(dataCacheService.generateInsightsKey());
  },

  // Templates caching
  getTemplates: <T>(): T | undefined => {
    return cacheService.get<T>(dataCacheService.generateTemplatesKey());
  },

  setTemplates: <T>(data: T): boolean => {
    return cacheService.set(dataCacheService.generateTemplatesKey(), data, CACHE_TTL.TEMPLATES);
  },

  invalidateTemplates: (): void => {
    // Clear templates cache
    cacheService.del(dataCacheService.generateTemplatesKey());
  },

  // Cache statistics
  getStats: () => {
    const baseStats = cacheService.getStats();
    return {
      ...baseStats,
      hitRate: baseStats.hits / (baseStats.hits + baseStats.misses) || 0,
    };
  },

  // Clear all data caches (only data namespace, not AI caches)
  clearAll: (): void => {
    cacheService.deleteByPattern(/^data:/);
  },
};

// Export cache namespace for use in AI service
export { CACHE_NAMESPACE };
