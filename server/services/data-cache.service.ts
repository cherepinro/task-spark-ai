import { cacheService } from './cache.service';
import md5 from 'md5';

const CACHE_TTL = {
  TASKS: 5 * 60,        // 5 minutes
  PROJECTS: 30 * 60,    // 30 minutes  
  INSIGHTS: 15 * 60,    // 15 minutes
  TEMPLATES: 30 * 60,   // 30 minutes
};

export const dataCacheService = {
  // Generate cache keys
  generateTasksKey: (filters?: { search?: string; priority?: string; status?: string; projectId?: string }) => {
    const key = filters ? md5(JSON.stringify(filters)) : 'all';
    return `tasks:${key}`;
  },

  generateProjectsKey: () => 'projects:all',
  
  generateInsightsKey: () => 'insights:all',
  
  generateTemplatesKey: () => 'templates:all',

  // Tasks caching
  getTasks: <T>(filters?: any): T | undefined => {
    const key = dataCacheService.generateTasksKey(filters);
    return cacheService.get<T>(key);
  },

  setTasks: <T>(data: T, filters?: any): boolean => {
    const key = dataCacheService.generateTasksKey(filters);
    return cacheService.set(key, data, CACHE_TTL.TASKS);
  },

  invalidateTasks: (): void => {
    // Clear all task caches by clearing the entire cache
    // Since we don't have direct access to cache keys, we flush all
    // This is acceptable as caches will rebuild quickly
    cacheService.flush();
  },

  // Projects caching
  getProjects: <T>(): T | undefined => {
    return cacheService.get<T>(dataCacheService.generateProjectsKey());
  },

  setProjects: <T>(data: T): boolean => {
    return cacheService.set(dataCacheService.generateProjectsKey(), data, CACHE_TTL.PROJECTS);
  },

  invalidateProjects: (): void => {
    // Clear all caches since tasks reference projects
    cacheService.flush();
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

  // Clear all data caches
  clearAll: (): void => {
    dataCacheService.invalidateTasks();
    dataCacheService.invalidateProjects();
    dataCacheService.invalidateInsights();
    dataCacheService.invalidateTemplates();
  },
};
