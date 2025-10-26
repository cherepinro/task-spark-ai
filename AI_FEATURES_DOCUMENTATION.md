# TaskSpark AI Features Documentation

This document provides a comprehensive overview of all AI-powered features in TaskSpark, including detailed prompts, logic flow, and implementation details.

## Table of Contents
1. [Overview](#overview)
2. [AI Configuration](#ai-configuration)
3. [Feature 1: Task Analysis](#feature-1-task-analysis)
4. [Feature 2: Natural Language Task Parsing](#feature-2-natural-language-task-parsing)
5. [Feature 3: Productivity Insights](#feature-3-productivity-insights)
6. [Feature 4: AI Chat Assistant](#feature-4-ai-chat-assistant)
7. [Feature 5: Task Decomposition](#feature-5-task-decomposition)
8. [Feature 6: AI Day Planner](#feature-6-ai-day-planner)
9. [Feature 7: Eisenhower Matrix Reorganization](#feature-7-eisenhower-matrix-reorganization)
10. [API Endpoints](#api-endpoints)
11. [Usage Limits](#usage-limits)

---

## Overview

TaskSpark AI uses OpenAI's **GPT-5** model (released August 7, 2025) through Replit's AI Integrations service. All AI features are designed with fallback mechanisms to ensure reliability even when the AI service is unavailable or returns unexpected results.

**Model**: `gpt-5`  
**Provider**: Replit AI Integrations (OpenAI-compatible API)  
**Primary Language**: Russian (Русский), with English support

---

## AI Configuration

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const MODEL = "gpt-5";
```

**Note**: GPT-5 only supports default temperature of 1 and cannot be customized.

---

## Feature 1: Task Analysis

### Description
Analyzes a task and provides intelligent suggestions including priority recommendation, categorization, and actionable tips.

### Function
`analyzeTask(task: InsertTask): Promise<AISuggestion>`

### Input Parameters
```typescript
interface InsertTask {
  title: string;
  description?: string;
}
```

### GPT-5 Prompt

**User Prompt**:
```
Analyze this task and provide suggestions in JSON format:
Title: {task.title}
Description: {task.description || "N/A"}

Provide:
1. Recommended priority (low, medium, or high)
2. A category for this task
3. Up to 3 helpful suggestions for completing it

Return as JSON with keys: priority, category, suggestions (array)
```

### API Configuration
```typescript
{
  model: "gpt-5",
  response_format: { type: "json_object" },
  max_completion_tokens: 500
}
```

### Output Format
```typescript
interface AISuggestion {
  priority?: "low" | "medium" | "high";
  category?: string;
  suggestions?: string[];
}
```

### Example Response
```json
{
  "priority": "high",
  "category": "Development",
  "suggestions": [
    "Break down into smaller subtasks",
    "Set a realistic deadline",
    "Identify required resources first"
  ]
}
```

### Fallback Mechanism
If the AI fails or returns invalid JSON:
```typescript
{ category: "General" }
```

### API Endpoint
`POST /api/ai/suggest`

**Request**:
```json
{
  "task": {
    "title": "Build user authentication",
    "description": "Implement login and signup"
  }
}
```

---

## Feature 2: Natural Language Task Parsing

### Description
Converts natural language input (in Russian or English) into structured task data, including title, description, priority, category, and project assignment.

### Function
`parseNaturalLanguageTask(input: string, userProjects?: UserProject[]): Promise<ParsedTask>`

### Input Parameters
```typescript
interface UserProject {
  id: string;
  name: string;
}
```

### GPT-5 Prompt

**User Prompt** (without projects):
```
Parse this natural language input into a structured task in JSON format:
"{input}"

Extract:
1. title - the main task description
2. description - any additional details (optional)
3. priority - assess urgency (low, medium, or high)
4. category - categorize the task (optional)
5. projectName - if the user mentions a project, extract the project name (optional)

Return as JSON with keys: title, description, priority, category, projectName
```

**User Prompt** (with projects):
```
Parse this natural language input into a structured task in JSON format:
"{input}"

Extract:
1. title - the main task description
2. description - any additional details (optional)
3. priority - assess urgency (low, medium, or high)
4. category - categorize the task (optional)
5. projectName - if the user mentions a project, extract the project name (optional)

Return as JSON with keys: title, description, priority, category, projectName

Available projects: "Project Alpha", "Project Beta", "Website Redesign"
If the user mentions one of these project names (in any language), include it as "projectName" in your response.
```

### API Configuration
```typescript
{
  model: "gpt-5",
  response_format: { type: "json_object" },
  max_completion_tokens: 300
}
```

### Output Format
```typescript
interface ParsedTask {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  category?: string;
  projectId?: string;
}
```

### Example Input/Output

**Input** (Russian):
```
"Создай задачу написать отчёт по проекту Website Redesign до пятницы"
```

**Output**:
```json
{
  "title": "Написать отчёт по проекту",
  "description": "Срок: до пятницы",
  "priority": "high",
  "category": "Documentation",
  "projectName": "Website Redesign",
  "projectId": "proj-123"
}
```

### Fallback Mechanism
If AI returns empty response, uses string processing to:
1. Remove task creation keywords ("создай задачу", "create task", etc.)
2. Extract project name using pattern matching
3. Return basic task with medium priority

**Fallback Keywords** (removed from title):
- English: "create task", "add task", "new task", "remind me to", "i need to"
- Russian: "создай задачу", "добавь задачу", "новая задача", "напомни мне"

### API Endpoint
`POST /api/ai/parse`

**Request**:
```json
{
  "input": "Создай задачу написать отчёт до пятницы"
}
```

---

## Feature 3: Productivity Insights

### Description
Generates motivating productivity insights based on user's task statistics.

### Function
`generateProductivityInsight(tasks: TaskSummary[]): Promise<{ title: string; description: string }>`

### Input Parameters
```typescript
interface TaskSummary {
  status: string;
  priority: string;
  title: string;
}
```

### GPT-5 Prompt

**User Prompt**:
```
Based on these task statistics, generate a helpful productivity insight in JSON format:
- Total tasks: {totalCount}
- Completed tasks: {completedCount}
- High priority tasks: {highPriorityCount}

Provide a motivating insight with:
1. title - short, engaging title
2. description - helpful advice or observation

Return as JSON with keys: title, description
```

### API Configuration
```typescript
{
  model: "gpt-5",
  response_format: { type: "json_object" },
  max_completion_tokens: 200
}
```

### Output Format
```json
{
  "title": "Great momentum!",
  "description": "You've completed 80% of your tasks. Keep focusing on those high-priority items to maintain your productivity streak."
}
```

### Fallback Mechanism
```json
{
  "title": "Keep going!",
  "description": "You're making progress on your tasks."
}
```

### API Endpoint
`POST /api/ai/generate-insight`

---

## Feature 4: AI Chat Assistant

### Description
Interactive chat assistant that helps users manage tasks, provides advice, and can automatically create tasks from conversational input.

### Function
`chatWithAI(message: string, conversationHistory: ChatMessage[], tasks: TaskSummary[], userProjects?: UserProject[]): Promise<ChatResponse>`

### Input Parameters
```typescript
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  message: string;
  taskSuggestion?: ParsedTask;
}
```

### GPT-5 Prompts

**System Prompt**:
```
You are TaskSpark AI, a task management assistant. Current tasks: {taskSummary}. 

IMPORTANT: You cannot create tasks directly. When users ask you to create a task, respond conversationally (e.g., "I'll help you create that task" or "Got it, creating a task for...") but DO NOT include task IDs or claim the task was added to the database. The system will automatically detect task creation requests and handle them separately.

Be concise and helpful.
```

**User Message**:
```
{user's message}
```

### API Configuration
```typescript
{
  model: "gpt-5",
  max_completion_tokens: 1000
}
```

### Task Intent Detection

The system automatically detects task creation keywords:

**English Keywords**:
- "create task", "add task", "new task", "remind me to", "i need to", "todo"

**Russian Keywords**:
- "создай задачу", "создать задачу", "добавь задачу", "добавить задачу"
- "новая задача", "новую задачу", "напомни мне", "напомнить мне"
- "мне нужно", "нужно сделать"

### Logic Flow

```
1. User sends message
2. Check for task creation keywords
3. If task intent detected:
   → Parse natural language task
   → Create taskSuggestion
4. Send message to GPT-5
5. If GPT-5 returns empty:
   → Use fallback message
   → Keep taskSuggestion if detected
6. Return response + taskSuggestion
```

### Example Conversation

**User**: "Создай задачу написать тесты для API"

**AI Response**:
```json
{
  "message": "Я помогу вам создать эту задачу!",
  "taskSuggestion": {
    "title": "Написать тесты для API",
    "priority": "high",
    "category": "Development"
  }
}
```

### Fallback Mechanism
If AI returns empty response:
```typescript
{
  message: taskSuggestion 
    ? "I'll help you create that task!"
    : "I'm processing your request. Could you rephrase or try again?",
  taskSuggestion
}
```

### API Endpoint
`POST /api/ai/chat`

**Request**:
```json
{
  "message": "What should I focus on today?",
  "conversationHistory": [
    { "role": "user", "content": "Hi!" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

---

## Feature 5: Task Decomposition

### Description
Breaks down a large task into 3-7 smaller subtasks with estimated hours for each.

### Function
`decomposeTask(title: string): Promise<DecomposeResponse>`

### GPT-5 Prompt

**User Prompt**:
```
Split this task into 3-7 smaller subtasks with estimated hours. Return as a markdown checklist:
"{title}"

Format each line as: - [ ] Task description (Xh)
Where X is the estimated hours (can be decimal like 2.5h).

Example:
- [ ] Research requirements (2h)
- [ ] Design UI mockups (4h)
- [ ] Implement frontend (8h)

Return ONLY the checklist, no other text.
```

### API Configuration
```typescript
{
  model: "gpt-5",
  max_completion_tokens: 1000
}
```

### Output Format
```typescript
interface DecomposedTask {
  title: string;
  hours: number;
}

interface DecomposeResponse {
  tasks: DecomposedTask[];
  tokensUsed: number;
}
```

### Example Response
```json
{
  "tasks": [
    { "title": "Research authentication libraries", "hours": 2 },
    { "title": "Design database schema for users", "hours": 3 },
    { "title": "Implement login endpoint", "hours": 4 },
    { "title": "Build signup form UI", "hours": 3 },
    { "title": "Add password encryption", "hours": 2 },
    { "title": "Write integration tests", "hours": 3 }
  ],
  "tokensUsed": 245
}
```

### Parsing Logic
Uses regex to extract tasks from markdown checklist:
```typescript
const checkboxMatch = line.match(/^-\s*\[[\sx]\]\s*(.+?)(?:\s*\((\d+(?:\.\d+)?)h\))?$/i);
```

### API Endpoint
`POST /api/ai/decompose`

**Request**:
```json
{
  "title": "Build user authentication system"
}
```

**Usage Limit**: 5 per month

---

## Feature 6: AI Day Planner

### Description
Creates an optimized daily schedule (08:00-22:00) based on user's tasks, habits, and busy time slots. Schedules high-priority tasks during peak productivity hours.

### Function
`generateDayPlan(input: DayPlanInput): Promise<TimeBlock[]>`

### Input Parameters
```typescript
interface DayPlanInput {
  tasks: Array<{ 
    id: string; 
    title: string; 
    description?: string; 
    priority?: string; 
    hours?: string 
  }>;
  habits?: Array<{ title: string; duration: number }>;
  busySlots?: Array<{ time: string; duration: number; title: string }>;
}
```

### GPT-5 Prompts

**System Prompt**:
```
You are an AI day planner assistant. Given tasks, habits, and busy time slots, create an optimized daily schedule from 08:00 to 22:00.

Rules:
1. Schedule high-priority tasks during peak productivity hours (09:00-12:00, 14:00-17:00)
2. Include breaks between long tasks
3. Respect busy slots (don't schedule anything during them)
4. Each time block should be 30-60 minutes
5. Include buffer time for transitions
6. Return time blocks in chronological order
7. IMPORTANT: You MUST include ALL tasks in the schedule

Return ONLY a valid JSON array of time blocks with this structure:
[
  {
    "id": "block-1",
    "time": "08:00",
    "duration": 60,
    "taskId": "task-id-123",
    "title": "Task title",
    "type": "task",
    "description": "Task details"
  }
]

CRITICAL: The response must be a valid JSON array. Include at least one time block for each task provided.
```

**User Prompt**:
```
Create a day plan with these inputs:

Tasks to schedule:
1. ID: task-abc, Title: "Write project proposal", Priority: high, Hours: 2
2. ID: task-def, Title: "Review code", Priority: medium, Hours: 1
3. ID: task-ghi, Title: "Team meeting prep", Priority: high, Hours: 1.5

Habits:
- Morning exercise (30 min)
- Evening reading (20 min)

Busy Time Slots:
- 13:00 for 60 min: Lunch break
- 18:00 for 30 min: Team standup

Generate an optimized daily schedule from 08:00 to 22:00. Include ALL 3 tasks in the schedule.
```

### API Configuration
```typescript
{
  model: "gpt-5",
  max_completion_tokens: 2000
}
```

### Output Format
```typescript
interface TimeBlock {
  id: string;
  time: string;         // "HH:MM" format
  duration: number;     // minutes
  taskId?: string;
  title: string;
  type: "task" | "habit" | "busy" | "free";
  description?: string;
}
```

### Example Response
```json
[
  {
    "id": "block-1",
    "time": "08:00",
    "duration": 30,
    "title": "Morning exercise",
    "type": "habit"
  },
  {
    "id": "block-2",
    "time": "09:00",
    "duration": 120,
    "taskId": "task-abc",
    "title": "Write project proposal",
    "type": "task",
    "description": "High priority - scheduled during peak hours"
  },
  {
    "id": "block-3",
    "time": "11:30",
    "duration": 90,
    "taskId": "task-ghi",
    "title": "Team meeting prep",
    "type": "task"
  },
  {
    "id": "block-4",
    "time": "13:00",
    "duration": 60,
    "title": "Lunch break",
    "type": "busy"
  }
]
```

### Fallback Mechanism

When AI fails or returns empty results, uses rule-based scheduling:

**Fallback Logic**:
1. Sort tasks by priority (high → medium → low)
2. Start at 08:00, end at 22:00
3. For each task:
   - Calculate duration from estimated hours (max 2 hours per block)
   - Schedule in chronological order
   - Add 10-minute breaks between tasks
4. Continue until all tasks scheduled or time runs out

**Fallback Code**:
```typescript
function generateFallbackDayPlan(input: DayPlanInput): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentTime = 8 * 60; // 08:00 in minutes
  const endTime = 22 * 60;  // 22:00 in minutes
  
  // Sort by priority
  const sortedTasks = [...input.tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
  });

  for (const task of sortedTasks) {
    if (currentTime >= endTime) break;
    
    const hours = parseFloat(task.hours || '1');
    const duration = Math.min(Math.round(hours * 60), 120);
    
    blocks.push({
      id: `block-${task.id}`,
      time: formatMinutesToTime(currentTime),
      duration,
      taskId: task.id,
      title: task.title,
      type: "task",
      description: task.description
    });
    
    currentTime += duration + 10; // +10 min break
  }
  
  return blocks;
}
```

### API Endpoint
`POST /api/ai/day-plan`

**Request**:
```json
{
  "tasks": ["task-abc", "task-def", "task-ghi"],
  "habits": [
    { "title": "Morning exercise", "duration": 30 }
  ],
  "busySlots": [
    { "time": "13:00", "duration": 60, "title": "Lunch" }
  ]
}
```

**Usage Limit**: 5 per day

---

## Feature 7: Eisenhower Matrix Reorganization

### Description
Analyzes tasks using the Eisenhower Matrix (urgent-important framework) and classifies each task into one of four quadrants to help users prioritize effectively.

### Function
`reorganizeTasks(input: ReorganizeInput): Promise<ReorganizeSuggestion[]>`

### Input Parameters
```typescript
interface ReorganizeInput {
  tasks: Array<{ 
    id: string; 
    title: string; 
    description?: string; 
    priority?: string; 
    status?: string; 
    dueDate?: string 
  }>;
  completedRatio7d: number; // 0-1, percentage completed in last 7 days
}
```

### Eisenhower Matrix Quadrants

| Quadrant | Description | Action |
|----------|-------------|--------|
| **urgent-important** | Critical tasks needing immediate attention | Do first |
| **important** | Important but not urgent | Schedule/plan |
| **urgent** | Urgent but less important | Delegate or do quickly |
| **not-urgent** | Neither urgent nor important | Defer or delete |

### GPT-5 Prompts

**System Prompt**:
```
You are an AI task organizer using the Eisenhower Matrix (urgent-important framework).

Classify each task into ONE of these 4 quadrants:
- **urgent-important**: Critical tasks that need immediate attention (high priority, do first)
- **important**: Important but not urgent, plan/schedule these (medium priority, do later)
- **urgent**: Urgent but less important, can be delegated or done quickly (high priority but lower value)
- **not-urgent**: Neither urgent nor important, consider deleting/deferring (low priority)

Consider:
1. Task priority and status
2. Due dates (overdue or soon = urgent)
3. Task descriptions and importance
4. User's completion ratio (if low < 50%, be more selective with urgent-important)

Return ONLY a valid JSON object with a suggestions array:
{
  "suggestions": [
    {
      "id": "task-id",
      "quadrant": "urgent-important|important|urgent|not-urgent",
      "reason": "Brief explanation (max 50 chars)"
    }
  ]
}

CRITICAL: You MUST provide exactly one suggestion for each task. Every task must be classified into one of the four quadrants. Do not return an empty array.
```

**User Prompt**:
```
User's 7-day completion ratio: 65%

Tasks to reorganize (you MUST classify ALL 5 tasks):
1. [task-abc] "Submit quarterly report" (Priority: high, Status: todo, Due: 2024-10-26)
2. [task-def] "Learn new framework" (Priority: medium, Status: todo)
3. [task-ghi] "Fix critical bug" (Priority: high, Status: in-progress, Due: 2024-10-25)
4. [task-jkl] "Organize files" (Priority: low, Status: todo)
5. [task-mno] "Review documentation" (Priority: medium, Status: todo, Due: 2024-11-05)

Apply Eisenhower Matrix principles and classify EACH of the 5 tasks into the appropriate quadrant. Return 5 suggestions.
```

### API Configuration
```typescript
{
  model: "gpt-5",
  response_format: { type: "json_object" },
  max_completion_tokens: 1500
}
```

### Output Format
```typescript
interface ReorganizeSuggestion {
  id: string;
  quadrant: "urgent-important" | "important" | "urgent" | "not-urgent";
  reason: string;
}
```

### Example Response
```json
{
  "suggestions": [
    {
      "id": "task-abc",
      "quadrant": "urgent-important",
      "reason": "Due tomorrow, high priority"
    },
    {
      "id": "task-def",
      "quadrant": "important",
      "reason": "No deadline, schedule learning time"
    },
    {
      "id": "task-ghi",
      "quadrant": "urgent-important",
      "reason": "Critical bug, overdue"
    },
    {
      "id": "task-jkl",
      "quadrant": "not-urgent",
      "reason": "Low priority, can defer"
    },
    {
      "id": "task-mno",
      "quadrant": "important",
      "reason": "Medium priority, distant deadline"
    }
  ]
}
```

### Fallback Mechanism

When AI fails or returns empty results, uses intelligent rule-based classification:

**Fallback Logic**:
```typescript
function generateFallbackReorganization(input: ReorganizeInput): ReorganizeSuggestion[] {
  const suggestions: ReorganizeSuggestion[] = [];
  const now = new Date();

  for (const task of input.tasks) {
    const priority = task.priority || 'medium';
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    // Check urgency
    const isOverdue = dueDate && dueDate < now;
    const isDueSoon = dueDate && !isOverdue && 
                      dueDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const isUrgent = isOverdue || isDueSoon;
    
    // Determine quadrant
    let quadrant: string;
    let reason: string;
    
    if (priority === 'high' && isUrgent) {
      quadrant = 'urgent-important';
      reason = isOverdue ? 'Overdue, high priority' : 'Due soon, high priority';
    } else if (priority === 'high' && !isUrgent) {
      quadrant = 'important';
      reason = 'High priority, schedule time';
    } else if (priority === 'medium' && isUrgent) {
      quadrant = 'urgent';
      reason = isOverdue ? 'Overdue, act quickly' : 'Due soon';
    } else if (priority === 'low' || (!isUrgent && priority === 'medium')) {
      quadrant = 'not-urgent';
      reason = priority === 'low' ? 'Low priority task' : 'Can be scheduled later';
    } else {
      quadrant = 'important';
      reason = 'Needs planning';
    }
    
    suggestions.push({ id: task.id, quadrant, reason });
  }
  
  return suggestions;
}
```

**Urgency Definition**:
- **Overdue**: Due date is in the past
- **Due Soon**: Due within 3 days

**Classification Rules**:
| Priority | Urgency | Quadrant |
|----------|---------|----------|
| High | Overdue/Due Soon | urgent-important |
| High | Not Urgent | important |
| Medium | Overdue/Due Soon | urgent |
| Medium | Not Urgent | not-urgent |
| Low | Any | not-urgent |

### API Endpoint
`POST /api/ai/reorganize`

**Request**:
```json
{
  "taskIds": ["task-abc", "task-def", "task-ghi"]
}
```

**Usage Limit**: 5 per day

---

## API Endpoints

### Summary Table

| Endpoint | Method | Feature | Limit |
|----------|--------|---------|-------|
| `/api/ai/suggest` | POST | Task Analysis | None |
| `/api/ai/parse` | POST | Natural Language Parsing | None |
| `/api/ai/generate-insight` | POST | Productivity Insights | None |
| `/api/ai/chat` | POST | AI Chat Assistant | 50/month |
| `/api/ai/decompose` | POST | Task Decomposition | 5/month |
| `/api/ai/day-plan` | POST | Day Planner | 5/day |
| `/api/ai/reorganize` | POST | Eisenhower Matrix | 5/day |

### Authentication
All endpoints require user authentication via session token or Firebase Auth.

### Rate Limiting
Features with usage limits return 429 status when exceeded:
```json
{
  "error": "Day planner limit reached. You can generate 5 plan per day. Resets tomorrow.",
  "remaining": 0,
  "limit": 5
}
```

---

## Usage Limits

Defined in `server/services/usage-tracker.service.ts`:

```typescript
export const USAGE_LIMITS = {
  ai_decompose: { monthly: 5, label: "AI Task Breakdown" },
  bulk_import: { monthly: 20, label: "Bulk Task Import" },
  ai_chat: { monthly: 50, label: "AI Chat Messages" },
  day_plan: { daily: 5, label: "AI Day Planner" },
  ai_reorganize: { daily: 5, label: "AI Reorganize (Eisenhower)" },
  tasks: { total: 500, label: "Total Tasks" },
  projects: { total: 50, label: "Total Projects" },
} as const;
```

### Check Usage
```
GET /api/usage
```

**Response**:
```json
{
  "day_plan": {
    "allowed": true,
    "remaining": 3,
    "used": 2,
    "limit": 5,
    "feature": "AI Day Planner"
  },
  "ai_reorganize": {
    "allowed": true,
    "remaining": 4,
    "used": 1,
    "limit": 5,
    "feature": "AI Reorganize (Eisenhower)"
  }
}
```

---

## Error Handling Best Practices

All AI features follow a consistent error handling pattern:

1. **Try-catch blocks** around API calls
2. **Detailed logging** at each step
3. **Fallback mechanisms** for reliability
4. **Empty response handling**
5. **JSON parsing validation**

### Example Pattern
```typescript
try {
  // Call GPT-5
  const response = await openai.chat.completions.create({...});
  const content = response.choices[0]?.message?.content || "{}";
  
  // Parse response
  let result = JSON.parse(content);
  
  // Validate result
  if (!result || result.length === 0) {
    logger.warn("Empty AI response, using fallback");
    result = generateFallback(input);
  }
  
  return result;
} catch (error) {
  logger.error("AI API failed", error);
  return generateFallback(input);
}
```

---

## Logging

All AI features use structured logging:

```typescript
logger.debug("Feature name", { context });
logger.info("Success message", { result });
logger.warn("Warning message", { details });
logger.error("Error message", error);
```

**Log Levels**:
- `DEBUG`: Input parameters, AI prompts
- `INFO`: Successful completions, parsed results
- `WARN`: Fallback activations, empty responses
- `ERROR`: API failures, parsing errors

---

## Internationalization

### Supported Languages
- **Primary**: Russian (Русский)
- **Secondary**: English

### Language Detection
The system automatically detects language from user input and responds accordingly. Task creation keywords are supported in both languages.

---

## Performance Considerations

### Token Limits
- Task Analysis: 500 tokens
- Natural Language Parsing: 300 tokens
- Productivity Insights: 200 tokens
- AI Chat: 1000 tokens
- Task Decomposition: 1000 tokens
- Day Planner: 2000 tokens
- Eisenhower Reorganization: 1500 tokens

### Response Times
- Typical AI response: 1-3 seconds
- Fallback response: <100ms
- Cached responses: Instant (where applicable)

---

## Future Enhancements

Potential improvements for AI features:

1. **Smart Caching**: Cache similar AI requests to reduce API calls
2. **Learning from User**: Adapt suggestions based on user behavior
3. **Multi-language Support**: Expand beyond Russian and English
4. **Voice Input**: Natural language parsing from voice commands
5. **Advanced Analytics**: ML-based procrastination prediction
6. **Template Learning**: Learn from user's task patterns
7. **Collaborative AI**: Share insights across team members

---

## Conclusion

TaskSpark AI leverages GPT-5's capabilities to provide intelligent task management assistance while maintaining reliability through comprehensive fallback mechanisms. All features are designed with user experience and data privacy in mind, using Replit's secure AI Integrations service.

For technical support or feature requests, please refer to the main project documentation.
