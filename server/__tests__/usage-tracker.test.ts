import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkUsage, incrementUsage, getAllUsage } from '../services/usage-tracker.service';
import { db } from '../db';
import { quotaUsage } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Usage Tracker Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkUsage', () => {
    it('should return allowed status for daily features within limit', async () => {
      // Mock database response - no usage yet
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await checkUsage('day_plan');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.feature).toBe('AI Day Planner');
    });

    it('should return not allowed status when daily limit is reached', async () => {
      // Mock database response - limit reached
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ callCount: 1 }]),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await checkUsage('day_plan');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.used).toBe(1);
    });

    it('should check monthly limits correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ callCount: 3 }]),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await checkUsage('bulk_import');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0); // Should have some remaining
      expect(result.limit).toBe(20); // Updated limit
    });

    it('should check ai_reorganize daily limit', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await checkUsage('ai_reorganize');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.feature).toBe('AI Reorganize (Eisenhower)');
    });
  });

  describe('incrementUsage', () => {
    it('should create new quota entry if none exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      
      (db.select as any) = mockSelect;
      (db.insert as any) = mockInsert;

      await incrementUsage('ai_reorganize');

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should update existing quota entry', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, callCount: 2 }]),
          }),
        }),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      
      (db.select as any) = mockSelect;
      (db.update as any) = mockUpdate;

      await incrementUsage('bulk_import');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should skip increment for total-limited features', async () => {
      const mockSelect = vi.fn();
      const mockInsert = vi.fn();
      const mockUpdate = vi.fn();
      
      (db.select as any) = mockSelect;
      (db.insert as any) = mockInsert;
      (db.update as any) = mockUpdate;

      await incrementUsage('tasks');

      // Should not call any DB operations for total-limited features
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsage', () => {
    it('should return usage data for all features', async () => {
      // This test would need more complex mocking
      // Simplified test to verify it returns an object
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await getAllUsage();

      expect(result).toHaveProperty('ai_decompose');
      expect(result).toHaveProperty('bulk_import');
      expect(result).toHaveProperty('ai_chat');
      expect(result).toHaveProperty('day_plan');
      expect(result).toHaveProperty('ai_reorganize');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('projects');
    });
  });
});
