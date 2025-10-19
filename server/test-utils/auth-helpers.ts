import { db } from "../db";
import { sessions } from "@shared/schema";
import { sql } from "drizzle-orm";
import { sign } from "cookie-signature";

/**
 * Test user credentials
 */
export const TEST_USER = {
  id: "test-user-regression",
  email: "test@taskspark.ai",
  name: "Test User",
  isAdmin: true,
  hasAIAccess: true,
};

/**
 * Create an authenticated session for testing
 * This creates a session in the database that can be used to authenticate requests
 */
export async function createTestSession(userId: string = TEST_USER.id): Promise<string> {
  const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const sessionData = {
    cookie: {
      originalMaxAge: 604800000,
      expires: expiresAt.toISOString(),
      httpOnly: true,
      path: "/",
    },
    passport: {
      user: {
        claims: {
          sub: userId,
          email: TEST_USER.email,
          name: TEST_USER.name,
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
      },
    },
  };

  await db.insert(sessions).values({
    sid: sessionId,
    sess: sessionData,
    expire: expiresAt,
  });

  return sessionId;
}

/**
 * Get signed session cookie for browser
 * Returns the cookie object that should be set in the browser
 */
export function getSessionCookie(sessionId: string, domain: string = "localhost") {
  const secret = process.env.SESSION_SECRET!;
  const signedValue = `s:${sign(sessionId, secret)}`;
  
  return {
    name: "connect.sid",
    value: signedValue,
    domain,
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}

/**
 * Clean up test session
 */
export async function cleanupTestSession(sessionId: string) {
  await db.delete(sessions).where(sql`sid = ${sessionId}`);
}

/**
 * Get all test sessions (for cleanup)
 */
export async function cleanupAllTestSessions() {
  await db.delete(sessions).where(sql`sid LIKE 'test-session-%'`);
}
