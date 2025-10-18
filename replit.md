# TaskSpark AI

## Overview
TaskSpark AI is an intelligent task management application powered by AI. It helps users organize, prioritize, and manage their tasks with smart categorization, AI-powered insights, and productivity analytics.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: In-memory storage (MemStorage)
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required)
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter
- **Form Handling**: React Hook Form + Zod

### Key Features
1. **Dashboard** - Overview with AI insights, completion rates, and productivity metrics
2. **Task Management** - Create, edit, delete, and organize tasks with priorities
3. **AI Features**:
   - Smart task categorization
   - Priority suggestions
   - Natural language task parsing
   - Productivity insights
4. **Views**:
   - Today - Tasks due today
   - Upcoming - Tasks grouped by due date
   - Projects - Project management
   - AI Insights - Intelligent recommendations
   - Archive - Completed/archived tasks
5. **Dark/Light Mode** - Full theme switching support

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

### API Routes (To Be Implemented)
- `GET/POST /api/tasks` - Task CRUD operations
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/ai/suggest` - Get AI suggestions for task
- `POST /api/ai/parse` - Parse natural language into task
- `GET /api/insights` - Get AI-generated insights
- `GET/POST /api/projects` - Project management

## Recent Changes
- 2025-01-XX: Initial project setup
- Created complete data schema (Task, Project, AIInsight)
- Built all frontend components and pages with exceptional visual quality
- Implemented dark/light theme system
- Created sidebar navigation with all main views
- Added OpenAI integration via Replit AI Integrations

## Development Status
- ✅ Phase 1: Schema & Frontend (Complete)
- ⏳ Phase 2: Backend Implementation (Pending)
- ⏳ Phase 3: Integration & Testing (Pending)

## User Preferences
- Prioritize visual excellence and polish
- Follow design guidelines strictly
- Dark mode as default theme
- AI features highlighted with purple accent color
