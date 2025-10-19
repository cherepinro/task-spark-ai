# Testing Guide

## Regression Test User

TaskSpark AI includes a regression test user for automated testing. This user is created with full permissions and can be used to test authentication flows without manual login.

### Setup

1. **Create the test user** (if not already created):
   ```bash
   tsx server/scripts/create-test-user.ts
   ```

   This creates:
   - A test user in the database with ID `test-user-regression`
   - A `test-credentials.json` file with user details
   - Full admin and AI access permissions

2. **Test Credentials**:
   - Email: `test@taskspark.ai`
   - User ID: `test-user-regression`
   - Admin: Yes
   - AI Access: Yes

### Using the Test User in Tests

#### Option 1: Database Session (Recommended)

```typescript
import { createTestSession, getSessionCookie, cleanupTestSession } from './server/test-utils/auth-helpers';

// In your test:
const sessionId = await createTestSession();

// Set cookie in browser (Playwright example)
const cookie = getSessionCookie(sessionId, 'localhost');
await page.context().addCookies([cookie]);

// Now the browser is authenticated as the test user
await page.goto('/');

// Cleanup after test
await cleanupTestSession(sessionId);
```

#### Option 2: Test Plan with DB Setup

```
1. [DB] Create test session using: INSERT INTO sessions (sid, sess, expire) VALUES (...)
2. [Browser] Set cookie connect.sid=s:{sessionId}
3. [Browser] Navigate to dashboard
4. [Verify] Assert user is authenticated
```

### Test User Details

The test user has:
- **Full Admin Access**: Can access `/admin` page and manage other users
- **AI Features**: Can use all AI endpoints (chat, decompose, day plan, etc.)
- **Push Notifications**: Enabled by default
- **Session Duration**: 7 days

### Important Notes

1. **Session Management**: The test user authenticates via database sessions, not through Replit Auth flow
2. **Cleanup**: Always clean up test sessions after tests to avoid database bloat
3. **Isolation**: Each test should create its own session for isolation
4. **CI/CD**: The `test-credentials.json` file is gitignored - recreate it in CI using the setup script

### Example Test Plan

```
Test: Authenticated User Dashboard Access

1. [DB] Create authenticated session for test user
   - SQL: Use createTestSession() helper
   - Returns: sessionId

2. [New Context] Create new browser context

3. [Browser] Set authentication cookie
   - Cookie: connect.sid=s:{sessionId}
   - Domain: localhost
   - Path: /

4. [Browser] Navigate to home page (/)

5. [Verify] Assert dashboard is displayed (not landing page)
6. [Verify] Ensure task list is visible
7. [Verify] Ensure sidebar has logout button

8. [Browser] Navigate to settings (/settings)
9. [Verify] Assert settings page loads
10. [Verify] Ensure push notification toggle is present

11. [Browser] Navigate to admin page (/admin)
12. [Verify] Assert admin dashboard is accessible
13. [Verify] Ensure user list is displayed

14. [API] Test AI endpoint with session cookie
15. [Verify] Assert AI endpoint returns success (not 403)

16. [DB] Cleanup test session
```

### Troubleshooting

**Session not working?**
- Verify the session cookie format: `s:` prefix + sessionId
- Check session expiry in database
- Ensure user exists in users table

**403 Forbidden on AI endpoints?**
- Verify `hasAIAccess` is true for test user
- Check middleware in server/routes.ts

**Admin page not accessible?**
- Verify `isAdmin` is true for test user
- Check admin middleware protection
