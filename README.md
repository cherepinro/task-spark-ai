# TaskSpark AI ⚡

An intelligent task management application with AI-powered features including day planning, task decomposition, bulk import, chat assistance, and Eisenhower Matrix reorganization. Available as both a web application and native Android mobile app.

## Features

### Core Task Management
- ✅ Create, edit, and organize tasks with priorities and due dates
- 📊 Dashboard with AI-powered insights and productivity analytics
- 🔄 Recurring tasks with flexible scheduling
- 📋 Task templates for common workflows
- 🗂️ Project organization and categorization
- 🔍 Advanced search and filtering

### AI-Powered Features
- 🤖 **Smart Categorization** - Automatic task categorization and priority suggestions
- 📝 **Natural Language Parsing** - Create tasks from plain text descriptions
- 💬 **AI Chat Assistant** - Get productivity advice and task management help
- 🗓️ **AI Day Planning** - Optimize your daily schedule with AI-generated time blocks
- 🧩 **Task Decomposition** - Break down complex tasks into manageable subtasks
- 🎯 **Eisenhower Swipe** - Tinder-like interface for AI-powered task reorganization using the Eisenhower Matrix

### Productivity Tools
- ⏱️ **Focus Sprint** - Neuro-inclusive productivity sessions with 10/2 min work/break cycles
- 🎵 Three stim sound options (white noise, brown noise, lo-fi beats)
- 📈 Productivity tracking and statistics
- 📥 Bulk task import from checklists
- 🎨 Dark mode with purple AI accents

### Cross-Platform
- 🌐 Progressive Web Application
- 📱 Native Android mobile app (via Capacitor)

## Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** for fast builds
- **Tailwind CSS** + **Shadcn UI** for modern styling
- **TanStack Query (v5)** for state management
- **Wouter** for routing
- **React Hook Form** + **Zod** for forms and validation
- **Capacitor 7.4+** for mobile app
- **@hello-pangea/dnd** for drag-and-drop
- **react-tinder-card** for swipe interactions

### Backend
- **Express.js** + **TypeScript**
- **PostgreSQL** (Neon) with **Drizzle ORM**
- **OpenAI GPT-5** via Replit AI Integrations
- In-memory caching for performance

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- OpenAI API access (via Replit AI Integrations)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CherepinRO/task-spark-ai.git
cd task-spark-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with:
```env
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `POST /api/tasks/bulk-import` - Bulk import tasks
- `PATCH /api/tasks/bulk` - Bulk update tasks

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a project
- `PATCH /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### AI Features
- `POST /api/ai/suggest` - Get AI task suggestions
- `POST /api/ai/parse` - Parse natural language into tasks
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/decompose` - Break down tasks into subtasks
- `POST /api/ai/day-plan` - Generate optimized daily schedule
- `POST /api/ai/reorganize` - Get Eisenhower Matrix reorganization suggestions

### Usage & Settings
- `GET /api/usage` - Get current usage statistics
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update user settings
- `GET /api/stats` - Get user statistics

### API Documentation
Interactive Swagger documentation available at `/docs` when running the development server.

## Usage Limits

AI features include usage tracking and limits:
- **AI Task Breakdown**: 5 per month
- **Bulk Task Import**: 10 per month
- **AI Chat Messages**: 50 per month
- **AI Day Planner**: 1 per day
- **AI Reorganize (Eisenhower)**: 1 per day
- **Total Tasks**: 500
- **Total Projects**: 50

Monthly limits reset on the 1st of each month. Daily limits reset every 24 hours.

## Building for Android

1. Build the web application:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npx cap sync android
```

3. Open in Android Studio:
```bash
npx cap open android
```

4. Build the APK or AAB from Android Studio

## Design Philosophy

TaskSpark AI follows a **Linear + Notion hybrid design philosophy**:
- **Clarity** - Clean, intuitive interfaces
- **Speed** - Fast interactions and minimal friction
- **Minimal decoration** - Focus on content over chrome
- **Dark mode first** - Optimized for reduced eye strain
- **Purple AI accents** - Visual distinction for AI-powered features

## Project Structure

```
task-spark-ai/
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utilities and helpers
│   │   └── hooks/        # Custom React hooks
├── server/               # Backend Express application
│   ├── routes.ts         # API route definitions
│   ├── services/         # Business logic services
│   └── storage.ts        # Database interface
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle database schema
└── android/              # Capacitor Android project
```

## Testing & Quality Assurance

### Regression Testing

Before every deployment, run the comprehensive regression test suite:

```
Tell Replit Agent: "Run regression tests before deployment"
```

The test suite validates:
- ✅ Task CRUD operations
- ✅ AI features (decompose, day plan, reorganize, chat)
- ✅ Project management
- ✅ Bulk import & templates
- ✅ Usage tracking & limits
- ✅ Error handling & caching
- ✅ All page navigation

**Coverage**: 73 test steps across 10 critical scenarios

See `REGRESSION_TESTING.md` for detailed testing documentation and `scripts/pre-deployment-checklist.md` for the full deployment checklist.

### Recent Improvements

**Architecture Improvements** (Oct 2025):
- ✅ Fixed cache invalidation (selective vs nuclear approach)
- ✅ Enhanced type safety (removed all `any` types)
- ✅ Added structured logging system
- ✅ Fixed React Query cache staleness issue
- ✅ Improved error handling consistency

See `ARCHITECTURE_IMPROVEMENTS.md` for all technical improvements.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Built by CherepinRO

---

**TaskSpark AI** - Smart Tasks, Sparking Productivity ⚡
