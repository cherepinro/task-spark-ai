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

### Running Tests in CI/CD

For automated testing in CI/CD pipelines:

1. **Set SESSION_SECRET environment variable** in your CI environment
2. **Run test user creation** as part of test setup:
   ```bash
   tsx server/scripts/create-test-user.ts
   ```
3. **Use auth helpers** in your test scripts
4. **Clean up** test sessions after tests complete

### Manual Testing

For quick manual testing:

```bash
# 1. Create test session
tsx server/scripts/test-session-example.ts

# 2. Copy the cookie value from output
# 3. In browser DevTools console:
document.cookie = "connect.sid={value-from-output}; path=/; domain=localhost"

# 4. Refresh page - you're now logged in as test user!
```

### Troubleshooting

**Session not working?**
- Verify the session cookie format: `s:` prefix + signed value
- Check session expiry in database
- Ensure user exists in users table
- Verify SESSION_SECRET matches between session creation and app

**403 Forbidden on AI endpoints?**
- Verify `hasAIAccess` is true for test user
- Check middleware in server/routes.ts
- Ensure session is valid and not expired

**Admin page not accessible?**
- Verify `isAdmin` is true for test user
- Check admin middleware protection

**Automated tests failing with "SESSION_SECRET not available"?**
- This is expected in sandboxed test environments
- Set SESSION_SECRET in your CI/CD environment variables
- Use the manual testing approach for local development

### Files Created

- `server/scripts/create-test-user.ts` - Creates test user in database
- `server/test-utils/auth-helpers.ts` - Session creation and cookie signing
- `server/scripts/test-session-example.ts` - Example session creation script
- `test-credentials.json` - Test user credentials (gitignored)
- `TESTING.md` - This documentation
