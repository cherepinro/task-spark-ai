import { db } from "../db";
import { quotaUsage } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const MONTHLY_QUOTA = 5;

export async function checkQuota(userId: string = "default"): Promise<{ allowed: boolean; remaining: number; callCount: number }> {
  const currentMonth = getCurrentMonth();
  
  const existingQuota = await db
    .select()
    .from(quotaUsage)
    .where(and(
      eq(quotaUsage.userId, userId),
      eq(quotaUsage.month, currentMonth)
    ))
    .limit(1);

  const callCount = existingQuota.length > 0 ? existingQuota[0].callCount : 0;
  const remaining = Math.max(0, MONTHLY_QUOTA - callCount);

  return {
    allowed: callCount < MONTHLY_QUOTA,
    remaining,
    callCount,
  };
}

export async function incrementQuota(userId: string = "default"): Promise<void> {
  const currentMonth = getCurrentMonth();
  
  const existingQuota = await db
    .select()
    .from(quotaUsage)
    .where(and(
      eq(quotaUsage.userId, userId),
      eq(quotaUsage.month, currentMonth)
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
        month: currentMonth,
        callCount: 1,
      });
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
