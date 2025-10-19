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
- Templates (`/api/templates`)
- Usage and statistics (`/api/usage`, `/api/settings`, `/api/stats`)
- Cache management (`/api/cache/stats`, `/api/cache/clear`)
- Swagger API documentation (`/docs`)

Performance is optimized through database indexing and an in-memory caching layer with intelligent invalidation.

## External Dependencies
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required)
- **Drag and Drop**: `@hello-pangea/dnd` for day planner reordering