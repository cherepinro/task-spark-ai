# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application available as both a web application and a native Android mobile app. It helps users organize, prioritize, and manage tasks with AI-powered categorization, insights, and productivity analytics. The project aims to provide a clear, fast, and minimally decorated user experience, combining elements from Linear and Notion.

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color

## System Architecture
TaskSpark AI uses a modern full-stack architecture. The frontend is built with **React 18 + TypeScript**, **Vite**, **Tailwind CSS**, and **Shadcn UI**, with **Capacitor 7.4+** enabling a native Android mobile app from the same codebase. State management is handled by **TanStack Query (React Query v5)**, routing by **Wouter**, and form handling by **React Hook Form + Zod**. The backend is implemented with **Express.js + TypeScript**.

Key features include a dynamic Dashboard, comprehensive Task Management (CRUD, search, filtering, recurring tasks, templates), and advanced AI capabilities such as smart categorization, priority suggestions, natural language parsing, productivity insights, AI-optimized Day Planning, and AI Task Decomposition. The application also features a "Focus Sprint" for neuro-inclusive productivity sessions and a robust usage tracking and limiting system across all AI features.

The design system emphasizes a **dark mode primary color palette** with **purple AI accents**. Typography uses **Inter** and **JetBrains Mono**. The component library is **Shadcn UI** with custom theming, adhering to a **Linear + Notion hybrid design philosophy** focused on clarity, speed, and minimal decoration.

Data models for `Task`, `Project`, `AIInsight`, `TaskTemplate`, `UserSettings`, and `UserStats` are defined to support the application's features, including fields for recurrence, AI suggestions, and usage statistics.

The API provides endpoints for:
- Task management (`/api/tasks`, `/api/tasks/bulk-import`)
- Project management (`/api/projects`)
- AI features (`/api/ai/suggest`, `/api/ai/parse`, `/api/ai/chat`, `/api/ai/decompose`, `/api/ai/day-plan`)
- ML features (`/api/ml/procrastination-score`)
- Templates (`/api/templates`)
- Usage and statistics (`/api/usage`, `/api/settings`, `/api/stats`)
- Push notifications (`/api/push/token`)
- Cache management (`/api/cache/stats`, `/api/cache/clear`)
- Swagger API documentation (`/docs`)

Performance is optimized through database indexing and an in-memory caching layer with intelligent invalidation.

## ML Microservice (PROMPT-07)
TaskSpark AI includes a **FastAPI-based ML microservice** (`/ml` directory) for procrastination score prediction:

- **Model**: Logistic regression (`procrastination-model.pkl`) trained on 10 behavioral features
- **Features** (float[10]):
  1. tasks_overdue_ratio (0-1)
  2. avg_task_completion_time (0-10 days)
  3. tasks_with_high_priority_incomplete (0-1)
  4. days_since_last_completion (0-30)
  5. task_creation_to_due_ratio (0-1)
  6. avg_task_age (0-30 days)
  7. completion_rate_last_week (0-1)
  8. tasks_in_progress_ratio (0-1)
  9. project_switching_frequency (0-1)
  10. ai_suggestions_ignored_ratio (0-1)
- **Endpoint**: `POST /features` returns `{score: 0-100, level: "low"|"moderate"|"high", confidence: 0-1}`
- **Deployment**: Fly.io-ready with Dockerfile and `fly.toml` configuration
- **Express Integration**: `/api/ml/procrastination-score` calls ML service with 1-hour cache
- **React UI**: Colored chip on Dashboard + bottom-sheet with personalized tips
- **Testing**: Golden unit tests with 5 known feature vectors

The Express backend calculates features from task data, calls the ML service (with fallback heuristics if unavailable), and caches results for 1 hour. The Dashboard displays the score as a color-coded badge (green/yellow/red) that opens a bottom-sheet with actionable recommendations.

## Push Notifications (PROMPT-13)
TaskSpark AI implements **Firebase Cloud Messaging (FCM)** push notifications for Android devices:

- **Backend Infrastructure**:
  - `server/services/firebase.service.ts` - Firebase Admin SDK integration for sending FCM messages
  - `server/services/notification.service.ts` - Notification service to send task due reminders
  - `server/routes.ts` - API endpoints: `POST /api/push/token`, `DELETE /api/push/token`
  - `shared/schema.ts` - `push_tokens` table for storing FCM device tokens
  - Environment variable: `FIREBASE_SERVICE_ACCOUNT_JSON` (Firebase service account credentials)

- **Frontend Integration**:
  - `client/src/hooks/usePushNotifications.ts` - React hook for registering FCM tokens on app start
  - Capacitor Push Notifications plugin (@capacitor/push-notifications)
  - Automatic token registration on app launch (native platforms only)
  - Foreground notification display via toast
  - Deep link handling for opening specific tasks from notifications

- **Deep Linking**:
  - URL scheme: `taskspark://task/{taskId}`
  - Configured in AndroidManifest.xml intent filter
  - Opens specific task when notification is tapped
  - Handled in `usePushNotifications` hook

- **Notification Types**:
  - Task due reminders (sent 1 hour before due date)
  - High-priority task alerts
  - AI insight notifications (future enhancement)

- **Setup Requirements**:
  - Firebase project with Android app registered (package: `ai.taskspark.app`)
  - `google-services.json` file in `android/app/` directory
  - Firebase service account JSON in environment variable
  - Android manifest configuration for FCM and deep links
  - See `PUSH_NOTIFICATIONS_SETUP.md` and `android/SETUP_PUSH_NOTIFICATIONS.md` for detailed setup

- **Token Management**:
  - Tokens stored in PostgreSQL `push_tokens` table with user association
  - Automatic cleanup of invalid/expired tokens
  - Support for multiple devices per user
  - Platform tracking (android/ios)

The notification service includes automatic detection and cleanup of invalid tokens, multicast messaging for sending to multiple devices, and integration with the task management system to send timely reminders.

## External Dependencies
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required)
- **Drag and Drop**: `@hello-pangea/dnd` for day planner reordering
- **ML Service**: FastAPI microservice (optionally deployed to Fly.io)
- **Push Notifications**: Firebase Cloud Messaging (FCM) via Firebase Admin SDK