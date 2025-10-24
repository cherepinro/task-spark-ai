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
**Problem**: AI Assistant claimed to create tasks but they didn't appear. After deployment, task creation completely stopped working when OpenAI returned empty responses.

**Root Causes**:
1. AI hallucinated fake task IDs
2. Empty OpenAI responses blocked task intent detection
3. Limited keyword detection ("create task" but not "create a task")

**Solution**:
- Reordered logic: task intent detection happens FIRST, before checking AI response
- Enhanced keywords: "create a task", "add a task", "remind me to", etc.
- Improved system prompt to prevent AI hallucination
- Resilient to empty API responses - tasks created even when OpenAI fails
- Russian error/success toasts, comprehensive logging

**Result**: Task creation works consistently, even with API failures. Tasks appear immediately in list.

**Files Modified**: `server/services/ai.service.ts`, `client/src/components/ai-chat-panel.tsx`