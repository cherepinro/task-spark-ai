# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application available as a web and native Android mobile app. It aims to help users organize, prioritize, and manage tasks with AI-powered categorization, insights, and productivity analytics. The project focuses on providing a clear, fast, and minimally decorated user experience, drawing inspiration from Linear and Notion, with a vision to enhance productivity and organization for its users.

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
- Primary language: Russian (Русский)
- Full internationalization support (Russian + English)

## System Architecture
TaskSpark AI utilizes a modern full-stack architecture. The frontend is built with React 18, TypeScript, Vite, Tailwind CSS, and Shadcn UI, enabling a native Android app via Capacitor 7.4+. State management uses TanStack Query (React Query v5), routing with Wouter, and form handling with React Hook Form + Zod. The backend is an Express.js + TypeScript application.

Key features include a dynamic Dashboard, comprehensive Task Management (CRUD, search, filtering, recurring tasks, templates, deadline datetime), and advanced AI capabilities such as smart categorization, priority suggestions, natural language parsing, productivity insights, AI-optimized Day Planning, and AI Task Decomposition. The application also includes a "Focus Sprint" feature and robust usage tracking for AI functionalities.

The design system is based on a dark mode color palette with purple accents for AI features. Typography uses Inter and JetBrains Mono. Shadcn UI components are used with custom theming to achieve a Linear + Notion hybrid design aesthetic.

Data models are defined for `Task`, `Project`, `AIInsight`, `TaskTemplate`, `UserSettings`, and `UserStats`, supporting features like recurrence, AI suggestions, and usage statistics.

The API provides endpoints for:
- Task and Project management
- AI features (suggest, parse, chat, decompose, day-plan)
- ML features (procrastination score)
- Templates, Usage, and Statistics
- Push Notifications
- Cache management
- Swagger API documentation

User authentication supports both custom email/password (with bcrypt) and Firebase Google OAuth. Sessions are managed via PostgreSQL. Role-based access control protects AI and admin endpoints. Push notifications are implemented using Firebase Cloud Messaging (FCM) for Android, including deep linking. Tasks due within the next hour trigger push notifications. The application supports full internationalization with Russian as the primary language, using `react-i18next`.

An independent FastAPI-based ML microservice calculates a user's procrastination score, integrated into the Express backend and displayed in the React UI with personalized tips.

## External Dependencies
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations
- **ML Service**: FastAPI microservice
- **Push Notifications**: Firebase Cloud Messaging (FCM) via Firebase Admin SDK
- **Authentication**: Firebase Google OAuth
- **Internationalization**: `react-i18next`
- **Drag and Drop**: `@hello-pangea/dnd`

## Recent Fixes & Architecture Decisions (Oct 2025)

### Cache Key User Isolation Bug (CRITICAL SECURITY FIX)
**Date**: October 23, 2025  
**Severity**: CRITICAL - Data Leakage Between Users

**Bug**: Server-side cache keys for projects, insights, and templates did not include `userId`, causing all users to share the same cached data. This resulted in:
- User A seeing User B's projects/insights/templates
- Empty production database showing cached data from other users
- Severe data privacy violation

**Root Cause**: Cache key generation in `server/services/data-cache.service.ts` used global keys like `data:projects:all` instead of per-user keys like `data:projects:{userId}:all`.

**Fix Applied**:
1. Updated `generateProjectsKey()`, `generateInsightsKey()`, `generateTemplatesKey()` to require `userId` parameter
2. Updated all cache getter/setter methods to accept `userId`
3. Updated all route handlers to pass `userId` when caching/retrieving data
4. Updated cache invalidation to be user-specific

**Production Cleanup Required**:
- Clear all caches via `POST /api/cache/clear` endpoint immediately after deployment
- This will remove contaminated cross-user cached data
- Caches will rebuild correctly with user isolation

**Files Modified**:
- `server/services/data-cache.service.ts`
- `server/routes.ts` (all project/insight/template endpoints)

### Usage Statistics User Isolation Bug
**Date**: October 23, 2025  
**Severity**: CRITICAL - Data Leakage Between Users

**Bug**: Task and project count queries were counting ALL tasks/projects across ALL users instead of filtering by userId. This resulted in:
- User A seeing total task/project counts from all users (not just their own)
- Incorrect usage statistics and limits
- Privacy violation showing aggregate statistics across users

**Root Cause**: In `server/services/usage-tracker.service.ts`, the count queries were missing userId filter:
```typescript
// BEFORE (Broken)
db.select({ count: count() }).from(tasks)
db.select({ count: count() }).from(projects)
```

**Fix Applied**:
```typescript
// AFTER (Fixed)
db.select({ count: count() }).from(tasks).where(eq(tasks.userId, userId))
db.select({ count: count() }).from(projects).where(eq(projects.userId, userId))
```

Additionally, the `/api/usage` endpoint was not passing `userId` to `getAllUsage()` function.

**Files Modified**:
- `server/services/usage-tracker.service.ts`
- `server/routes.ts` (GET /api/usage endpoint)

### Authorization Bypass Vulnerabilities (CRITICAL SECURITY FIX)
**Date**: October 23, 2025  
**Severity**: CRITICAL - Unauthorized Data Modification/Deletion

**Bug**: Multiple PATCH and DELETE endpoints lacked ownership verification, allowing ANY authenticated user to modify or delete ANY other user's data by simply knowing/guessing the resource ID. This affected:
- Tasks (PATCH /api/tasks/:id, DELETE /api/tasks/:id, PATCH /api/tasks/bulk)
- Projects (PATCH /api/projects/:id, DELETE /api/projects/:id)
- Templates (PATCH /api/templates/:id, DELETE /api/templates/:id)

**Impact**: 
- User A could delete User B's tasks/projects/templates
- User A could modify User B's tasks/projects/templates
- Bulk operations could modify multiple users' tasks simultaneously
- Complete authorization bypass for these operations

**Root Cause**: Route handlers called storage layer methods (e.g., `updateTask`, `deleteProject`) without first verifying that the authenticated user owns the resource. The storage layer only filters by ID, not by userId.

**Fix Applied**: Added ownership verification to all affected endpoints:
```typescript
// BEFORE (Vulnerable)
app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
  const updates = updateTaskSchema.parse(req.body);
  const task = await storage.updateTask(req.params.id, updates);
  // ...
});

// AFTER (Secured)
app.patch("/api/tasks/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  
  // Verify ownership before update
  const existingTask = await storage.getTask(req.params.id);
  if (!existingTask) {
    return res.status(404).json({ error: "Task not found" });
  }
  if (existingTask.userId !== userId) {
    return res.status(403).json({ error: "Forbidden: You don't own this task" });
  }
  
  const updates = updateTaskSchema.parse(req.body);
  const task = await storage.updateTask(req.params.id, updates);
  // ...
});
```

**Endpoints Fixed**:
- PATCH /api/tasks/:id - Added ownership check
- DELETE /api/tasks/:id - Added ownership check
- PATCH /api/tasks/bulk - Added batch ownership verification (rejects entire request if any task is unauthorized)
- PATCH /api/projects/:id - Added ownership check
- DELETE /api/projects/:id - Added ownership check
- PATCH /api/templates/:id - Added ownership check
- DELETE /api/templates/:id - Added ownership check

**Files Modified**:
- `server/routes.ts` (all affected PATCH/DELETE endpoints)

### Schema Validation Fix
**Critical Bug Fixed**: All insert schemas were incorrectly requiring `userId` in the request body. This prevented task/project creation as the client couldn't pass validation. **Solution**: All insert schemas now omit `userId` field - the server extracts it from the authenticated session and adds it after validation.

Affected schemas:
- `insertTaskSchema`
- `insertProjectSchema`
- `insertAIInsightSchema`
- `insertTaskTemplateSchema`
- `insertUserSettingsSchema`
- `insertUserStatsSchema`
- `insertPushTokenSchema`

### Per-Task Notification Settings (RE-ADDED)
**Date**: October 23, 2025  
**Status**: Feature Re-implemented

**Description**: Re-added per-task notification customization with nullable fields. Users can now configure custom reminder times for each task individually.

**New Fields in Task Schema**:
- `enableReminder` (boolean, nullable) - Enable/disable notification for this specific task
- `reminderHoursBefore` (integer, nullable) - How many hours before deadline to send notification (1-168 hours)

**Behavior**:
- If `enableReminder` is `true` and `reminderHoursBefore` is set, notification is sent at the custom time
- If `enableReminder` is `false` or `null`, falls back to default behavior (1 hour before deadline)
- Notifications only sent for tasks with `deadlineDateTime` or `dueDate` set

**UI Changes**:
- Added notification settings section in task creation/edit modal
- Bell icon indicates notification settings
- Toggle switch to enable/disable per-task reminders
- Number input (1-168 hours) for custom reminder time
- All UI text in Russian

**Backend Changes**:
- Updated `NotificationService.checkAndSendDueTaskNotifications()` to respect per-task settings
- Notification time calculated based on task's `reminderHoursBefore` value
- Falls back to 1 hour default if custom settings not configured

**Files Modified**:
- `shared/schema.ts` - Added nullable fields to tasks table
- `client/src/components/task-creation-modal.tsx` - Added UI controls
- `server/services/notification.service.ts` - Updated notification logic

### Admin Access
Admin access configured for `cherepin.roman@yandex.ru` in development. Production database requires manual update to grant admin role.