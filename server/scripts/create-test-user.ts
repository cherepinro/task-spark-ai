import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const TEST_USER = {
  id: "test-user-regression",
  email: "test@taskspark.ai",
  name: "Test User",
  avatarUrl: null,
  isAdmin: true,
  hasAIAccess: true,
  pushNotificationsEnabled: true,
};

async function createTestUser() {
  try {
    // Check if test user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, TEST_USER.id))
      .limit(1);

    if (existing.length > 0) {
      console.log("✓ Test user already exists");
      console.log("  Email:", TEST_USER.email);
      console.log("  ID:", TEST_USER.id);
    } else {
      // Create test user
      await db.insert(users).values(TEST_USER);
      console.log("✓ Created test user");
      console.log("  Email:", TEST_USER.email);
      console.log("  ID:", TEST_USER.id);
    }

    // Save credentials to file
    const credentials = {
      userId: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      isAdmin: TEST_USER.isAdmin,
      hasAIAccess: TEST_USER.hasAIAccess,
    };

    const credentialsPath = path.join(process.cwd(), "test-credentials.json");
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log("✓ Saved credentials to test-credentials.json");

    process.exit(0);
  } catch (error) {
    console.error("✗ Failed to create test user:", error);
    process.exit(1);
  }
}

createTestUser();
