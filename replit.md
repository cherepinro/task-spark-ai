# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application available as a web and native Android mobile app. It helps users organize, prioritize, and manage tasks with AI-powered categorization, insights, and productivity analytics. The project aims to provide a clear, fast, and minimally decorated user experience, inspired by Linear and Notion, to enhance user productivity and organization. Key capabilities include a dynamic Dashboard, comprehensive Task Management (CRUD, search, filtering, recurring tasks, templates, deadline datetime), and advanced AI features such as smart categorization, priority suggestions, natural language parsing, productivity insights, AI-optimized Day Planning, and AI Task Decomposition.

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
- Primary language: Russian (Русский)
- Full internationalization support (Russian + English)

## System Architecture
TaskSpark AI employs a modern full-stack architecture. The frontend uses React 18, TypeScript, Vite, Tailwind CSS, and Shadcn UI, with Capacitor 7.4+ for the native Android app. State management is handled by TanStack Query (React Query v5), routing by Wouter, and form handling by React Hook Form + Zod. The backend is an Express.js + TypeScript application.

The design system features a dark mode palette with purple accents for AI elements, using Inter and JetBrains Mono fonts. Shadcn UI components are themed to achieve a Linear + Notion hybrid aesthetic.

Core features include:
- **Task Management**: CRUD operations, search, filtering, recurring tasks, templates, deadline management.
- **AI Capabilities**: Smart categorization, priority suggestions, natural language parsing, productivity insights, AI-optimized Day Planning, AI Task Decomposition into subtasks (stored as JSONB within the parent task).
- **Focus Sprint** feature.
- **Sticky Notes**: Quick notes feature with voice input (Web Speech API), text formatting (bold, italic, lists using markdown syntax), customizable colors, and ability to convert notes into tasks. Full CRUD operations with user-specific data isolation. Optimized for mobile with larger text fields.
- **User Authentication**: Custom email/password (with bcrypt) and Firebase OAuth for Google sign-in. Firebase Auth SDK for frontend, backend verification of Firebase ID tokens. Sessions managed via PostgreSQL. Role-based access control for AI and admin endpoints.
- **Internationalization**: Full support with `react-i18next`, Russian as primary.

Data models for `Task`, `Project`, `AIInsight`, `TaskTemplate`, `UserSettings`, `UserStats`, and `StickyNote` support features like recurrence, AI suggestions, usage statistics, and quick notes. The API provides endpoints for Task and Project management, various AI features (suggest, parse, chat, decompose, day-plan), ML features (procrastination score), Templates, Sticky Notes, Usage, Statistics, Push Notifications, and Cache management, with Swagger documentation.

A separate FastAPI-based ML microservice calculates a user's procrastination score, integrated with the Express backend and displayed in the React UI.

## External Dependencies
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations
- **ML Service**: FastAPI microservice
- **Push Notifications**: Firebase Cloud Messaging (FCM) via Firebase Admin SDK
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Internationalization**: `react-i18next`
- **Drag and Drop**: `@hello-pangea/dnd`

## Recent Changes

### November 4, 2025 - Sticky Notes Feature & Text Editor

1. **Text Editor Improvements**
   - Added simple text formatting toolbar with Bold, Italic, and List buttons
   - Markdown syntax support: `**bold**`, `*italic*`, `- list items`
   - Automatic HTML rendering in view mode (bold → `<strong>`, italic → `<em>`, lists → `<ul><li>`)
   - Mobile optimization: increased textarea height (min-h-32 on mobile vs min-h-24 on desktop)
   - Larger sticky note cards on mobile (h-80 vs h-64 on desktop) for better usability
   - Enhanced text readability with `text-base` font size

2. **New Sticky Notes Feature**
   - Added full CRUD functionality for sticky notes with PostgreSQL backend
   - Implemented voice input using Web Speech API for creating and editing notes
   - Six customizable colors: yellow, pink, blue, green, purple, orange
   - Convert sticky notes to tasks functionality (sets dueDate to today)
   - Responsive grid layout with card-based UI
   - Full Russian and English localization
   - Database: `sticky_notes` table with user isolation
   - API endpoints: GET/POST/PATCH/DELETE `/api/sticky-notes`
   - Frontend page: `/sticky-notes` with sidebar navigation

### October 28, 2025

### Critical Bug Fixes
1. **Date Picker Off-by-One Month Error** (FIXED)
   - **Issue**: When users selected a date in the calendar (e.g., October 30), the system saved and displayed it as the previous month (September 30)
   - **Root Cause**: Calendar component had `showOutsideDays={true}` by default, which displayed days from adjacent months. Clicking on these "outside days" selected dates from the wrong month
   - **Solution**: Set `showOutsideDays={false}` in Calendar component to prevent displaying/selecting days from adjacent months
   - **Location**: `task-creation-modal.tsx` line 378
   - **DO NOT REMOVE**: This fix is essential for correct date handling - removing it will cause month selection bugs

2. **Task Sorting Enhancement**
   - Updated sorting logic in `upcoming.tsx` and `today.tsx` to prioritize date FIRST (earliest to latest), THEN priority within same date
   - Previous behavior incorrectly prioritized by priority level first

3. **Date Display Improvements**
   - Changed task deadline display from muted text to prominent colored badge with "d MMM" format
   - Enhanced visual hierarchy for deadline information

### Test Account
- Email: test@admin.com
- Password: test123
- Role: Admin with full AI access