# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application powered by AI, available as both a **web application** and **native Android mobile app**. It helps users organize, prioritize, and manage their tasks with smart categorization, AI-powered insights, and productivity analytics.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Mobile**: Capacitor 7.4+ (Android native app from same codebase)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required)
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter
- **Form Handling**: React Hook Form + Zod

### Key Features
1. **Dashboard** - Overview with AI insights, completion rates, and productivity metrics
2. **Task Management** - Create, edit, delete, and organize tasks with priorities
3. **Search & Filtering** - Real-time search by title/description, filter by priority, status, and project
4. **AI Features**:
   - Smart task categorization
   - Priority suggestions
   - Natural language task parsing
   - Productivity insights
5. **Views**:
   - Today - Tasks due today
   - Upcoming - Tasks grouped by due date
   - Projects - Project management
   - AI Insights - Intelligent recommendations
   - Day Planner - AI-optimized daily schedule with drag-and-drop time blocks
   - Templates - Reusable task templates
   - Archive - Completed/archived tasks
6. **Dark/Light Mode** - Full theme switching support

### Data Models

#### Task
- id, title, description
- priority (low, medium, high)
- status (todo, in-progress, completed, archived)
- dueDate, completedAt, createdAt
- projectId
- isAISuggested, aiCategory
- isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, parentTaskId

#### Project
- id, name, color, createdAt

#### AIInsight
- id, type, title, description, data, createdAt

#### TaskTemplate
- id, name, title, description, priority, projectId
- isRecurring, recurrencePattern, recurrenceInterval, createdAt

### Design System
- **Color Palette**: Dark mode primary with purple AI accents
- **Typography**: Inter (primary), JetBrains Mono (monospace)
- **Component Library**: Shadcn UI with custom theming
- **Design Philosophy**: Linear + Notion hybrid - clarity, speed, minimal decoration
- Full design guidelines in `design_guidelines.md`

### API Routes
- `GET /api/tasks?search=&priority=&status=&projectId=` - Get tasks with optional filters
- `POST /api/tasks` - Create new task (enforces 500 task limit)
- `POST /api/tasks/bulk-import` - Import multiple tasks from markdown checklist (enforces 20/month limit)
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project (enforces 50 project limit)
- `DELETE /api/projects/:id` - Delete project
- `GET /api/insights` - Get AI-generated insights
- `POST /api/ai/suggest` - Get AI suggestions for task
- `POST /api/ai/parse` - Parse natural language into task
- `POST /api/ai/chat` - AI chat conversation (enforces 50/month limit)
- `POST /api/ai/decompose` - AI task decomposition (enforces 5/month limit, splits task into 3-7 subtasks with hours)
- `POST /api/ai/day-plan` - Generate AI-optimized daily schedule (enforces 1/day limit, returns time blocks 08:00-22:00)
- `GET /api/templates` - Get all task templates
- `POST /api/templates` - Create new task template
- `DELETE /api/templates/:id` - Delete task template
- `POST /api/templates/:id/create-task` - Create task from template
- `GET /api/usage` - Get current usage statistics for all features
- `GET /api/cache/stats` - Get cache performance statistics
- `POST /api/cache/clear` - Clear all caches (admin/debug)
- `GET /docs` - Swagger API documentation

## Recent Changes
- 2025-10-19: **AI Day Planner Feature** - Generate optimized daily schedules with drag-and-drop time blocks
  - POST /api/ai/day-plan endpoint with GPT-5 integration (default temperature)
  - DayPlan page at /day-plan with task selector and vertical timeline (08:00-22:00)
  - Drag-and-drop reordering with @hello-pangea/dnd
  - ICS file export for calendar integration
  - Apply button to update task dueDates based on schedule
  - Daily usage limit: 1 plan per day (tracked in quotaUsage with YYYY-MM-DD format)
  - CalendarClock icon in sidebar navigation
  - Database schema: expanded month column to varchar(10) for daily tracking
- 2025-10-19: **Comprehensive Usage Tracking & Limiting System** - Monitor and enforce usage across all features
  - Added featureType column to quotaUsage schema for multi-feature tracking
  - UsageTracker service with configurable limits per feature type
  - GET /api/usage endpoint returns real-time usage for all features
  - Usage enforcement at API level: tasks (500 total), projects (50 total), bulk imports (20/month), AI breakdowns (5/month), AI chat (50/month)
  - UsageWidget component on Dashboard with progress bars, color-coded warnings, and auto-refresh
  - 429 status codes with detailed error messages when limits exceeded
  - Full E2E test coverage with Playwright
- 2025-10-19: **Bulk Task Import from Checklist** - Import multiple tasks at once from markdown format
  - POST /api/tasks/bulk-import endpoint accepting markdown checklist format
  - BulkImportDialog component with live task count preview
  - "Import Checklist" button on Dashboard with ListChecks icon
  - Supports format: `- [ ] Task name (Xh)` with optional hours notation
  - Default priority and project selection for all imported tasks
  - Success toast showing count of imported tasks
  - Full E2E test coverage with Playwright
- 2025-10-19: **Task Breakdown UI Feature** - Full frontend integration for AI task decomposition
  - "Breakdown Task" menu item in task cards with Zap icon
  - One-click task decomposition available on Dashboard, Today, and Upcoming pages
  - Hours badge display with Clock icon showing time estimates (e.g., "4h", "8h")
  - Success toast with subtask count, total hours, and quota information
  - Automatically hides breakdown option for completed tasks
  - Integrated with existing POST /api/ai/decompose endpoint
- 2025-10-19: **Performance Optimization System** - 140x faster data access with caching & indexing
  - Database indexes on 13 columns (priority, status, dueDate, projectId, etc.)
  - In-memory caching layer for tasks, projects, insights, templates (5-30min TTL)
  - Intelligent cache invalidation on all mutations
  - GET /api/cache/stats - Monitor cache performance (hits, misses, hitRate)
  - POST /api/cache/clear - Clear all caches
  - Response headers: X-Cache HIT/MISS indicators
  - Sub-millisecond response times for cached requests
  - Full documentation in PERFORMANCE.md
- 2025-10-19: **AI Task Decomposition Feature** - Auto-split complex tasks into subtasks with AI
  - POST /api/ai/decompose endpoint with GPT-5 integration
  - Markdown checklist parsing (- [ ] Task (Xh) format)
  - In-memory caching with md5(title) keys, 90-day TTL
  - Quota system: 5 free calls/month, auto-resets monthly
  - Database schema: added hours field to tasks, new quotaUsage table
  - Swagger API docs at /docs endpoint
  - Full test coverage with vitest + supertest + Playwright
- 2025-10-19: **Android Mobile App Support** - Full Capacitor integration for native Android app
  - Added Capacitor 7.4+ with Android platform
  - Mobile-optimized viewport and meta tags
  - Native plugins: App, Keyboard, Status Bar
  - Same codebase serves both web and mobile
  - Full documentation in MOBILE.md
  - Build outputs to android/ directory ready for Android Studio
- 2025-10-18: **Task Templates Feature Complete** - Save frequently used tasks as reusable templates
  - Added task_templates table with name, title, description, priority, recurrence settings
  - Backend API routes: GET/POST/DELETE /api/templates, POST /api/templates/:id/create-task
  - "Save as Template" option in task dropdown menus (Dashboard, Today pages)
  - Dedicated Templates page (/templates) with grid layout and "Use" buttons
  - useSaveTemplate hook for easy integration across pages
  - SaveTemplateDialog component for naming templates
  - Templates preserve all task properties except dueDate, status, completedAt
- 2025-10-18: **Recurring Tasks Feature Complete** - Tasks automatically create next occurrence when completed
  - Added database fields: isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, parentTaskId
  - UI controls in task modal with validation (due date required for recurring tasks)
  - Backend auto-generation of next occurrence with calculateNextOccurrence()
  - Visual "Weekly/Daily/Monthly/Yearly" badges on recurring task cards
- 2025-10-18: **AI Chat Integration Complete** - Natural language task creation working
- 2025-10-18: Fixed critical bug in AI chat - apiRequest returns Response object, must call .json()
- 2025-10-18: Simplified AI system prompts to avoid token limit issues (max_completion_tokens: 1000)
- 2025-10-18: Migrated to PostgreSQL database with Drizzle ORM
- 2025-10-18: Implemented search and filtering (by title, description, priority, status, project)
- 2025-10-18: Added FilterContext for global filter state management

## Development Status
- ✅ Phase 1: Schema & Frontend (Complete)
- ✅ Phase 2: Backend Implementation (Complete)
- ✅ Phase 3: Integration & Testing (Complete)
- ✅ Phase 4: Database Persistence (Complete)
- ✅ Phase 5: Search & Filtering (Complete)
- ✅ Phase 6: AI Chat Integration (Complete)
- ✅ Phase 7: Recurring Tasks (Complete)
- ✅ Phase 8: Task Templates (Complete)
- ✅ Phase 9: Android Mobile App (Complete)

## Next Features
- iOS mobile app support
- App icon and splash screen customization
- Push notifications for mobile
- Offline support with local storage
- Task collaboration & sharing
- Advanced analytics dashboard
- File attachments
- Subtasks & dependencies
- Kanban board view

## Implemented Features
- ✅ **AI Day Planner** - Generate optimized daily schedules with one click
  - Select tasks and generate AI-powered time blocks from 08:00-22:00
  - Drag-and-drop reordering with visual timeline
  - Export to ICS file for calendar apps
  - Apply schedule to update task due dates
  - 1 plan per day limit (resets daily at midnight)
- ✅ **Usage Tracking & Limiting System** - Monitor feature usage with visual progress bars on dashboard
  - Track 6 feature types: tasks (500 total), projects (50 total), bulk imports (20/month), AI breakdowns (5/month), AI chat (50/month), day plans (1/day)
  - Real-time usage widget with color-coded warnings (yellow at 80%, red at 100%)
  - API enforcement returns 429 status when limits exceeded
  - Auto-refreshing dashboard widget shows remaining quota
- ✅ **Native Android Mobile App** - Full Capacitor integration with same codebase
- ✅ **Bulk Task Import from Checklist** - Paste markdown checklists to create multiple tasks instantly
- ✅ Complete task management with CRUD operations
- ✅ PostgreSQL database persistence with Drizzle ORM
- ✅ Real-time search and filtering (by title/description, priority, status, project)
- ✅ Global filter state management with FilterContext
- ✅ **AI Chat with Natural Language Task Creation** - Type "add task buy milk" and it creates the task
- ✅ **AI Task Breakdown** - One-click breakdown of complex tasks into 3-7 subtasks with time estimates
- ✅ AI-powered task analysis and categorization
- ✅ Priority-based task organization
- ✅ Dashboard with productivity metrics
- ✅ Multiple view modes (Today, Upcoming, Projects, AI Insights, Archive, Templates)
- ✅ Dark/Light theme switching
- ✅ Task creation modal with form validation
- ✅ AI chat panel with conversation history
- ✅ Automatic task creation from AI conversations
- ✅ **Recurring Tasks** - Daily, weekly, monthly, yearly patterns with auto-generation
- ✅ **Task Templates** - Save and reuse frequently used tasks
- ✅ **Hours Tracking** - Visual time estimates on tasks with purple badges
- ✅ Toast notifications for task creation and AI operations
- ✅ Command palette with keyboard shortcuts (⌘K)
- ✅ Beautiful empty states and loading skeletons
- ✅ Real-time task completion tracking
- ✅ Responsive design across all breakpoints (web & mobile)

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
