# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application available as a web and native Android mobile app. It helps users organize, prioritize, and manage tasks with AI-powered categorization, insights, and productivity analytics. The project aims to provide a clear, fast, and minimally decorated user experience, inspired by Linear and Notion, to enhance user productivity and organization.

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
- Primary language: Russian (Русский)
- Full internationalization support (Russian + English)

## System Architecture
TaskSpark AI employs a modern full-stack architecture. The frontend uses React 18, TypeScript, Vite, Tailwind CSS, and Shadcn UI, with Capacitor 7.4+ for the native Android app. State management is handled by TanStack Query (React Query v5), routing by Wouter, and form handling by React Hook Form + Zod. The backend is an Express.js + TypeScript application.

Core features include a dynamic Dashboard, comprehensive Task Management (CRUD, search, filtering, recurring tasks, templates, deadline datetime), and advanced AI capabilities such as smart categorization, priority suggestions, natural language parsing, productivity insights, AI-optimized Day Planning, and AI Task Decomposition. A "Focus Sprint" feature and robust AI usage tracking are also included.

The design system features a dark mode palette with purple accents for AI elements, using Inter and JetBrains Mono fonts. Shadcn UI components are themed to achieve a Linear + Notion hybrid aesthetic.

Data models for `Task`, `Project`, `AIInsight`, `TaskTemplate`, `UserSettings`, and `UserStats` support features like recurrence, AI suggestions, and usage statistics.

The API provides endpoints for Task and Project management, various AI features (suggest, parse, chat, decompose, day-plan), ML features (procrastination score), Templates, Usage, Statistics, Push Notifications, and Cache management, with Swagger documentation.

User authentication supports custom email/password (with bcrypt) and Firebase OAuth for Google sign-in. Firebase Auth SDK handles frontend authentication, with backend verification of Firebase ID tokens. Sessions are managed via PostgreSQL. Role-based access control protects AI and admin endpoints. Push notifications are implemented via Firebase Cloud Messaging (FCM) for Android, including deep linking, with notifications for tasks due within the next hour. The application supports full internationalization with Russian as the primary language using `react-i18next`.

An independent FastAPI-based ML microservice calculates a user's procrastination score, integrated with the Express backend and displayed in the React UI.

## External Dependencies
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations
- **ML Service**: FastAPI microservice
- **Push Notifications**: Firebase Cloud Messaging (FCM) via Firebase Admin SDK
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Internationalization**: `react-i18next`
- **Drag and Drop**: `@hello-pangea/dnd`

## Recent Fixes

### AI Chat Task Creation Fix (October 24, 2025)
**Problem**: AI Assistant claimed to create tasks but they didn't appear. After deployment, task creation completely stopped working when OpenAI returned empty responses. Additionally, Russian language input didn't work at all.

**Root Causes**:
1. AI hallucinated fake task IDs
2. Empty OpenAI responses blocked task intent detection
3. Limited keyword detection ("create task" but not "create a task")
4. **NO Russian language support** - only English keywords were detected

**Solution**:
- Reordered logic: task intent detection happens FIRST, before checking AI response
- Enhanced English keywords: "create a task", "add a task", "remind me to", etc.
- **Added Russian keywords**: "создай задачу", "добавь задачу", "напомни мне", "мне нужно", "новая задача", etc.
- Improved system prompt to prevent AI hallucination
- Resilient to empty API responses - tasks created even when OpenAI fails
- Russian error/success toasts, comprehensive logging

**Result**: Task creation works consistently in **both Russian and English**, even with API failures. Tasks appear immediately in list.

**Supported Languages**:
- 🇷🇺 Russian: "Создай задачу купить молоко", "Добавь задачу позвонить врачу", "Напомни мне..."
- 🇬🇧 English: "Create a task to buy milk", "Add a task to call the doctor", "Remind me to..."

**Files Modified**: `server/services/ai.service.ts`, `client/src/components/ai-chat-panel.tsx`

### AI Project Assignment Fix (October 24, 2025)
**Problem**: When asking AI to create tasks with project assignments in Russian (e.g., "Создай задачу купить молоко в проекте Домашние дела"), tasks were created without projectId, and title was the full prompt text.

**Root Causes**:
1. Backend called `getAllProjects({ userId })` instead of `getAllProjects(userId)` - projects not fetched
2. OpenAI parsing returns empty content - no fallback system
3. Frontend didn't pass projectId to POST /api/tasks - lost in transmission

**Solution - Three Fixes**:

1. **Fixed getAllProjects Call** (`server/routes.ts`):
   - Changed from `getAllProjects({ userId })` to `getAllProjects(userId)`
   - Projects now properly fetched and passed to AI

2. **Added Fallback String Processing** (`server/services/ai.service.ts`):
   - When OpenAI returns empty, uses keyword-based extraction
   - Detects Russian: "в проекте" and English: "in project", "for project"
   - Cleans titles: removes "Создай задачу", "Add task", etc.
   - Matches project names case-insensitively

3. **Frontend Passes projectId** (`client/src/components/ai-chat-panel.tsx`):
   - Checks if `taskSuggestion.projectId` exists
   - Includes projectId in POST /api/tasks payload
   - Logs: "[AI Chat] Including projectId in task"

**Result**: Complete end-to-end project assignment works in Russian and English. Tasks get clean titles and correct projectId.

**Example**:
- Input: "Создай задачу купить молоко в проекте Домашние дела"
- Created Task: `{title: "купить молоко", projectId: "abc123", ...}`
- Result: ✅ Task appears under "Домашние дела" project

**Files Modified**: `server/routes.ts`, `server/services/ai.service.ts`, `client/src/components/ai-chat-panel.tsx`