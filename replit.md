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