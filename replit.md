# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application available as both a web application and a native Android mobile app. It helps users organize, prioritize, and manage tasks with AI-powered categorization, insights, and productivity analytics. The project aims to provide a clear, fast, and minimally decorated user experience, combining elements from Linear and Notion.

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
- **Primary language: Russian (Русский)**
- Full internationalization support (Russian + English)

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

## User Authentication & Authorization (PROMPT-14 + PROMPT-15)
TaskSpark AI implements **dual authentication**: custom email/password authentication with bcrypt and **Firebase Google OAuth**, providing flexible sign-in options:

- **Authentication System**:
  - `server/auth.ts` - Authentication routes (email/password login, signup, logout, Firebase OAuth)
  - `server/services/auth.service.ts` - Password hashing with bcrypt (10 salt rounds)
  - `server/services/firebase.service.ts` - Firebase Admin SDK for token verification
  - Session management using PostgreSQL with `connect-pg-simple`
  - `isAuthenticated` middleware for protecting routes
  - `requiresAIAccess` middleware for role-based access control
  - Auto-creates admin account on first run (`admin@taskspark.local`)

- **Firebase Google OAuth Integration**:
  - Client-side Firebase Authentication with `signInWithPopup`
  - Backend verifies Firebase ID tokens using Firebase Admin SDK
  - Firebase endpoint: `POST /api/auth/firebase` accepts Firebase ID token
  - Automatic user creation or linking when signing in with Google
  - Links Google account to existing email if email matches
  - Stores Google profile image URL in user profile
  - Environment variables (frontend): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
  - Environment variable (backend): `FIREBASE_SERVICE_ACCOUNT_JSON` (shared with push notifications)
  - Login page includes "Sign in with Google" button with Google logo
  - Setup guide: See `FIREBASE_AUTH_SETUP.md`

- **Database Schema**:
  - `users` table - Stores user profiles with role fields and OAuth support:
    - `id`: Unique user identifier (UUID)
    - `email`: User email address (unique, required)
    - `password_hash`: Bcrypt-hashed password (nullable for OAuth users)
    - `google_id`: Google OAuth ID (unique, optional)
    - `first_name`: User first name (optional)
    - `last_name`: User last name (optional)
    - `profile_image_url`: Profile picture URL (from Google or uploaded)
    - `is_admin`: Admin privileges flag (default: false)
    - `has_ai_access`: AI features access flag (default: true)
    - `push_notifications_enabled`: Push notification preference (default: true)
    - `created_at`: Account creation timestamp
    - `updated_at`: Last update timestamp
  - `sessions` table - PostgreSQL session store for express-session

- **Role-Based Access Control**:
  - All API endpoints require authentication via `isAuthenticated` middleware
  - AI endpoints protected with `requiresAIAccess` middleware:
    - `/api/ai/suggest`, `/api/ai/parse`, `/api/ai/chat`
    - `/api/ai/decompose`, `/api/ai/day-plan`, `/api/ai/reorganize`
    - `/api/ai/generate-insight`
  - Admin endpoints require `is_admin` flag for user management
  - All routes use authenticated user ID (`req.user.id`) for user-specific data

- **Frontend Authentication**:
  - `client/src/hooks/useAuth.ts` - React hook for auth state management
  - `client/src/pages/login.tsx` - Login form with email/password
  - `client/src/pages/signup.tsx` - Signup form with validation
  - `client/src/pages/admin.tsx` - Admin dashboard for user management
  - `client/src/App.tsx` - Auth state handling and protected routes
  - **Login flow**: Unauthenticated users are automatically redirected to `/login`
  - **Auto-redirect**: After successful login/signup, users are redirected to dashboard
  - Sidebar includes logout button and admin link (for admins)
  - Toast notifications for login/signup errors
  - Form validation with Zod schemas

- **Admin Features** (`/admin` page):
  - View all users with their roles and access levels
  - Toggle AI access for individual users
  - Promote/demote admin privileges
  - Real-time user list updates
  - Protected route (requires `is_admin: true`)

- **API Endpoints**:
  - `POST /api/signup` - Create new user account (email, password, firstName?, lastName?)
  - `POST /api/login` - Authenticate user (email, password)
  - `POST /api/auth/firebase` - Authenticate with Firebase ID token (Google OAuth)
  - `POST /api/logout` - End user session
  - `GET /api/auth/user` - Get current user profile
  - `PATCH /api/auth/user` - Update user preferences (push notifications)
  - `GET /api/admin/users` - List all users (admin only)
  - `PATCH /api/admin/users/:id` - Update user roles (admin only)

- **Access Control Flow**:
  1. New users get full access by default (`has_ai_access: true`)
  2. Users can toggle push notifications in Settings page
  3. Admins can revoke AI access for specific users
  4. Protected endpoints return 403 if user lacks required role
  5. All user-specific data isolated by authenticated user ID

- **Session Management**:
  - PostgreSQL-backed sessions with `connect-pg-simple`
  - Session secret from `SESSION_SECRET` environment variable
  - 7-day session expiration
  - Secure cookie settings in production
  - Automatic session invalidation on logout

- **Password Security**:
  - Bcrypt hashing with 10 salt rounds for email/password users
  - Password validation on signup
  - Email uniqueness enforced at database level
  - Automatic admin password generation on first run
  - OAuth users don't have passwords (password_hash is null)

The authentication system ensures secure user registration and login through both email/password and Firebase Google OAuth. All AI features are properly gated, user data is isolated, and admins can manage access control through a dedicated dashboard. Firebase integration provides a seamless, secure sign-in experience while maintaining full compatibility with the existing email/password system. Firebase also handles push notifications, creating a unified authentication and notification infrastructure.

## Internationalization (i18n)
TaskSpark AI supports **full internationalization** with **Russian as the primary language**:

- **Library**: `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- **Default Language**: Russian (ru)
- **Supported Languages**: Russian (Русский), English
- **Translation Files**:
  - `client/src/i18n/locales/ru.json` - Russian translations
  - `client/src/i18n/locales/en.json` - English translations (fallback)
- **Configuration**: `client/src/i18n/config.ts` - i18next setup with Russian default
- **Features**:
  - Language switcher in Settings page
  - Automatic language detection from browser/localStorage
  - Comprehensive translations for all UI elements
  - Navigation, tasks, projects, AI features, settings, and admin panel
- **Components**: `LanguageSwitcher` component for language selection

## External Dependencies
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Custom email/password authentication with bcrypt (10 salt rounds)
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required)
- **Drag and Drop**: `@hello-pangea/dnd` for day planner reordering
- **ML Service**: FastAPI microservice (optionally deployed to Fly.io)
- **Push Notifications**: Firebase Cloud Messaging (FCM) via Firebase Admin SDK
- **Internationalization**: `react-i18next` with Russian as primary language