#!/usr/bin/env tsx

/**
 * Example script showing how to create and use a test session
 * This can be used to manually test authentication or debug session issues
 */

import { createTestSession, getSessionCookie, cleanupTestSession, TEST_USER } from "../test-utils/auth-helpers";

async function main() {
  console.log("Creating test session for user:", TEST_USER.email);
  
  // Create session
  const sessionId = await createTestSession();
  console.log("✓ Session created:", sessionId);
  
  // Get signed cookie
  const cookie = getSessionCookie(sessionId);
  console.log("\n✓ Signed cookie:");
  console.log("  Name:", cookie.name);
  console.log("  Value:", cookie.value);
  console.log("  Domain:", cookie.domain);
  
  console.log("\n✓ Use this in your browser:");
  console.log(`  document.cookie = "${cookie.name}=${cookie.value}; path=/; domain=${cookie.domain}"`);
  
  console.log("\n✓ Or in Playwright:");
  console.log(`  await page.context().addCookies([{`);
  console.log(`    name: "${cookie.name}",`);
  console.log(`    value: "${cookie.value}",`);
  console.log(`    domain: "${cookie.domain}",`);
  console.log(`    path: "/",`);
  console.log(`    httpOnly: true,`);
  console.log(`    sameSite: "Lax"`);
  console.log(`  }]);`);
  
  console.log("\n✓ Session will expire in 7 days");
  console.log("\n✓ To cleanup:");
  console.log(`  tsx server/scripts/cleanup-test-session.ts ${sessionId}`);
  
  // Optionally cleanup immediately (comment out to keep session)
  // await cleanupTestSession(sessionId);
  // console.log("\n✓ Session cleaned up");
}

main().catch(console.error);
