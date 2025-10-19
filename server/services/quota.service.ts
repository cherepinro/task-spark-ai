// Legacy quota service - migrated to usage-tracker.service.ts
// Keeping for backward compatibility
import { checkUsage, incrementUsage } from "./usage-tracker.service";

export async function checkQuota(userId: string = "default"): Promise<{ allowed: boolean; remaining: number; callCount: number }> {
  const usage = await checkUsage('ai_decompose', userId);
  return {
    allowed: usage.allowed,
    remaining: usage.remaining,
    callCount: usage.used,
  };
}

export async function incrementQuota(userId: string = "default"): Promise<void> {
  await incrementUsage('ai_decompose', userId);
}
