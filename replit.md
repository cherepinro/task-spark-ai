# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application powered by AI. It helps users organize, prioritize, and manage their tasks with smart categorization, AI-powered insights, and productivity analytics.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Shadcn UI
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

#### Project
- id, name, color, createdAt

#### AIInsight
- id, type, title, description, data, createdAt

### Design System
- **Color Palette**: Dark mode primary with purple AI accents
- **Typography**: Inter (primary), JetBrains Mono (monospace)
- **Component Library**: Shadcn UI with custom theming
- **Design Philosophy**: Linear + Notion hybrid - clarity, speed, minimal decoration
- Full design guidelines in `design_guidelines.md`

### API Routes
- `GET /api/tasks?search=&priority=&status=&projectId=` - Get tasks with optional filters
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/insights` - Get AI-generated insights
- `POST /api/ai/suggest` - Get AI suggestions for task
- `POST /api/ai/parse` - Parse natural language into task
- `POST /api/ai/chat` - AI chat conversation

## Recent Changes
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

## Next Features
- Task collaboration & sharing
- Advanced analytics dashboard
- Task templates
- File attachments
- Subtasks & dependencies

## Implemented Features
- ✅ Complete task management with CRUD operations
- ✅ PostgreSQL database persistence with Drizzle ORM
- ✅ Real-time search and filtering (by title/description, priority, status, project)
- ✅ Global filter state management with FilterContext
- ✅ **AI Chat with Natural Language Task Creation** - Type "add task buy milk" and it creates the task
- ✅ AI-powered task analysis and categorization
- ✅ Priority-based task organization
- ✅ Dashboard with productivity metrics
- ✅ Multiple view modes (Today, Upcoming, Projects, AI Insights, Archive)
- ✅ Dark/Light theme switching
- ✅ Task creation modal with form validation
- ✅ AI chat panel with conversation history
- ✅ Automatic task creation from AI conversations
- ✅ Toast notifications for task creation
- ✅ Command palette with keyboard shortcuts (⌘K)
- ✅ Beautiful empty states and loading skeletons
- ✅ Real-time task completion tracking
- ✅ Responsive design across all breakpoints

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
