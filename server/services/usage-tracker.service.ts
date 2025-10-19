import { db } from "../db";
import { quotaUsage, tasks, projects } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";

// Define usage limits for different features
export const USAGE_LIMITS = {
  ai_decompose: { monthly: 5, label: "AI Task Breakdown" },
  bulk_import: { monthly: 20, label: "Bulk Task Import" },
  ai_chat: { monthly: 50, label: "AI Chat Messages" },
  day_plan: { daily: 1, label: "AI Day Planner" },
  ai_reorganize: { daily: 1, label: "AI Reorganize (Eisenhower)" },
  tasks: { total: 500, label: "Total Tasks" },
  projects: { total: 50, label: "Total Projects" },
} as const;

export type FeatureType = keyof typeof USAGE_LIMITS;

interface UsageCheck {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  feature: string;
}

export async function checkUsage(
  featureType: FeatureType,
  userId: string = "default"
): Promise<UsageCheck> {
  const limit = USAGE_LIMITS[featureType];
  
  // For daily limits (day_plan)
  if ('daily' in limit) {
    const currentDay = getCurrentDay();
    
    const existingQuota = await db
      .select()
      .from(quotaUsage)
      .where(and(
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.featureType, featureType),
        eq(quotaUsage.month, currentDay) // Reusing month column for day tracking
      ))
      .limit(1);

    const used = existingQuota.length > 0 ? existingQuota[0].callCount : 0;
    const remaining = Math.max(0, limit.daily - used);

    return {
      allowed: used < limit.daily,
      remaining,
      used,
      limit: limit.daily,
      feature: limit.label,
    };
  }
  
  // For monthly limits (ai_decompose, bulk_import, ai_chat)
  if ('monthly' in limit) {
    const currentMonth = getCurrentMonth();
    
    const existingQuota = await db
      .select()
      .from(quotaUsage)
      .where(and(
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.featureType, featureType),
        eq(quotaUsage.month, currentMonth)
      ))
      .limit(1);

    const used = existingQuota.length > 0 ? existingQuota[0].callCount : 0;
    const remaining = Math.max(0, limit.monthly - used);

    return {
      allowed: used < limit.monthly,
      remaining,
      used,
      limit: limit.monthly,
      feature: limit.label,
    };
  }
  
  // For total limits (tasks, projects)
  if ('total' in limit) {
    let used = 0;
    
    if (featureType === 'tasks') {
      const result = await db.select({ count: count() }).from(tasks);
      used = result[0]?.count || 0;
    } else if (featureType === 'projects') {
      const result = await db.select({ count: count() }).from(projects);
      used = result[0]?.count || 0;
    }
    
    const remaining = Math.max(0, limit.total - used);

    return {
      allowed: used < limit.total,
      remaining,
      used,
      limit: limit.total,
      feature: limit.label,
    };
  }

  throw new Error(`Unknown feature type: ${featureType}`);
}

export async function incrementUsage(
  featureType: FeatureType,
  userId: string = "default"
): Promise<void> {
  const limit = USAGE_LIMITS[featureType];
  
  // Skip for total-limited features
  if ('total' in limit) {
    return; // Total-limited features are counted from actual DB records
  }

  // Use appropriate time period (day or month)
  const timePeriod = 'daily' in limit ? getCurrentDay() : getCurrentMonth();
  
  const existingQuota = await db
    .select()
    .from(quotaUsage)
    .where(and(
      eq(quotaUsage.userId, userId),
      eq(quotaUsage.featureType, featureType),
      eq(quotaUsage.month, timePeriod) // Reusing month column for both
    ))
    .limit(1);

  if (existingQuota.length > 0) {
    await db
      .update(quotaUsage)
      .set({ 
        callCount: existingQuota[0].callCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(quotaUsage.id, existingQuota[0].id));
  } else {
    await db
      .insert(quotaUsage)
      .values({
        userId,
        featureType,
        month: timePeriod,
        callCount: 1,
      });
  }
}

export async function getAllUsage(userId: string = "default"): Promise<Record<FeatureType, UsageCheck>> {
  const features: FeatureType[] = ['ai_decompose', 'bulk_import', 'ai_chat', 'day_plan', 'ai_reorganize', 'tasks', 'projects'];
  
  const usageData = await Promise.all(
    features.map(async (feature) => ({
      feature,
      data: await checkUsage(feature, userId),
    }))
  );

  return usageData.reduce((acc, { feature, data }) => {
    acc[feature] = data;
    return acc;
  }, {} as Record<FeatureType, UsageCheck>);
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentDay(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
