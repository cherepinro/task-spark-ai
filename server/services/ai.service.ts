import OpenAI from "openai";
import type { InsertTask } from "@shared/schema";
import { CACHE_NAMESPACE } from './data-cache.service';
import { logger } from './logger.service';

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-5", not "gpt-4o" or "gpt-4". gpt-5 was released August 7, 2025 after your knowledge cutoff. Always prefer using gpt-5 as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to older models: `// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user`
2. Use the response_format: { type: "json_object" } option
3. Request output in JSON format in the prompt
*/

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const MODEL = "gpt-5";

interface AISuggestion {
  priority?: "low" | "medium" | "high";
  category?: string;
  suggestions?: string[];
}

interface ParsedTask {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  category?: string;
}

export async function analyzeTask(task: InsertTask): Promise<AISuggestion> {
  try {
    const prompt = `Analyze this task and provide suggestions in JSON format:
Title: ${task.title}
Description: ${task.description || "N/A"}

Provide:
1. Recommended priority (low, medium, or high)
2. A category for this task
3. Up to 3 helpful suggestions for completing it

Return as JSON with keys: priority, category, suggestions (array)`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { category: "General" };
    }

    return JSON.parse(content) as AISuggestion;
  } catch (error) {
    logger.serviceError('ai', 'analyzeTask', error, { taskTitle: task.title });
    return { category: "General" };
  }
}

export async function parseNaturalLanguageTask(
  input: string
): Promise<ParsedTask> {
  try {
    const prompt = `Parse this natural language input into a structured task in JSON format:
"${input}"

Extract:
1. title - the main task description
2. description - any additional details (optional)
3. priority - assess urgency (low, medium, or high)
4. category - categorize the task (optional)

Return as JSON with keys: title, description, priority, category`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        title: input,
        priority: "medium",
      };
    }

    return JSON.parse(content) as ParsedTask;
  } catch (error) {
    logger.serviceError('ai', 'parseNaturalLanguageTask', error, { input });
    return {
      title: input,
      priority: "medium",
    };
  }
}

interface TaskSummary {
  status: string;
  priority: string;
  title: string;
}

export async function generateProductivityInsight(
  tasks: TaskSummary[]
): Promise<{ title: string; description: string }> {
  try {
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const totalCount = tasks.length;
    const highPriorityCount = tasks.filter((t) => t.priority === "high").length;

    const prompt = `Based on these task statistics, generate a helpful productivity insight in JSON format:
- Total tasks: ${totalCount}
- Completed tasks: ${completedCount}
- High priority tasks: ${highPriorityCount}

Provide a motivating insight with:
1. title - short, engaging title
2. description - helpful advice or observation

Return as JSON with keys: title, description`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        title: "Keep going!",
        description: "You're making progress on your tasks.",
      };
    }

    return JSON.parse(content);
  } catch (error) {
    logger.serviceError('ai', 'generateProductivityInsight', error, { taskCount: tasks.length });
    return {
      title: "Keep going!",
      description: "You're making progress on your tasks.",
    };
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  taskSuggestion?: ParsedTask;
}

export async function chatWithAI(
  message: string,
  conversationHistory: ChatMessage[],
  tasks: TaskSummary[]
): Promise<ChatResponse> {
  try {
    const taskSummary = tasks.length > 0 
      ? tasks.slice(0, 3).map(t => `${t.title} (${t.priority}, ${t.status})`).join(', ')
      : "no tasks";

    const systemPrompt = `You are TaskSpark AI, a task management assistant. Current tasks: ${taskSummary}. 

IMPORTANT: You cannot create tasks directly. When users ask you to create a task, respond conversationally (e.g., "I'll help you create that task" or "Got it, creating a task for...") but DO NOT include task IDs or claim the task was added to the database. The system will automatically detect task creation requests and handle them separately.

Be concise and helpful.`;

    // Filter out any messages with invalid content
    const validHistory = conversationHistory.filter(
      (msg) => msg.content && typeof msg.content === "string" && msg.content.trim() !== ""
    );

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...validHistory,
      { role: "user", content: message },
    ];

    logger.info('AI Chat: Processing message', { 
      messageCount: messages.length, 
      userMessage: message.substring(0, 50),
      historyLength: validHistory.length 
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_completion_tokens: 1000,
    });

    logger.info('AI Chat: OpenAI API response', {
      choicesCount: response.choices?.length,
      finishReason: response.choices?.[0]?.finish_reason,
      hasContent: !!response.choices?.[0]?.message?.content,
      contentType: typeof response.choices?.[0]?.message?.content,
      contentValue: response.choices?.[0]?.message?.content,
      fullResponse: JSON.stringify(response).substring(0, 500)
    });

    // Check if the message contains a task creation intent FIRST
    // This ensures task creation works even if OpenAI returns empty response
    const taskKeywords = ["create task", "add task", "new task", "remind me to", "i need to", "todo", "create a task", "add a task"];
    const messageLower = message.toLowerCase();
    const containsTaskIntent = taskKeywords.some(keyword => messageLower.includes(keyword));

    logger.info('AI Chat: Task intent detection', {
      message: message.substring(0, 100),
      messageLower: messageLower.substring(0, 100),
      containsTaskIntent,
      matchedKeywords: taskKeywords.filter(k => messageLower.includes(k))
    });

    let taskSuggestion: ParsedTask | undefined;
    if (containsTaskIntent) {
      logger.info('AI Chat: Parsing natural language task');
      taskSuggestion = await parseNaturalLanguageTask(message);
      logger.info('AI Chat: Task suggestion created', { taskSuggestion });
    }

    // Now check if AI response is empty
    const aiMessage = response.choices[0]?.message?.content;
    
    if (!aiMessage || aiMessage.trim() === "") {
      logger.warn('AI Chat: Empty response from OpenAI API - using fallback', { 
        hasChoices: !!response.choices.length,
        hasMessage: !!response.choices[0]?.message,
        messageObject: response.choices[0]?.message,
        finishReason: response.choices?.[0]?.finish_reason,
        taskSuggestionCreated: !!taskSuggestion
      });
      
      // Return a helpful fallback but KEEP the task suggestion if we detected one
      return {
        message: taskSuggestion 
          ? "I'll help you create that task!"
          : "I'm processing your request. Could you rephrase or try again? I'm here to help with task management!",
        taskSuggestion,
      };
    }

    logger.info('AI Chat: Response received', { 
      responseLength: aiMessage.length,
      responsePreview: aiMessage.substring(0, 50),
      hasTaskSuggestion: !!taskSuggestion
    });

    return {
      message: aiMessage,
      taskSuggestion,
    };
  } catch (error) {
    logger.serviceError('ai', 'chatWithAI', error, { 
      userMessage: message.substring(0, 50),
      historyLength: conversationHistory.length 
    });
    throw error;
  }
}

export interface DecomposedTask {
  title: string;
  hours: number;
}

export interface DecomposeResponse {
  tasks: DecomposedTask[];
  tokensUsed: number;
}

export async function decomposeTask(title: string): Promise<DecomposeResponse> {
  try {
    const prompt = `Split this task into 3-7 smaller subtasks with estimated hours. Return as a markdown checklist:
"${title}"

Format each line as: - [ ] Task description (Xh)
Where X is the estimated hours (can be decimal like 2.5h).

Example:
- [ ] Research requirements (2h)
- [ ] Design UI mockups (4h)
- [ ] Implement frontend (8h)

Return ONLY the checklist, no other text.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    const tokensUsed = response.usage?.total_tokens || 0;

    const tasks = parseMarkdownChecklist(content);

    return {
      tasks,
      tokensUsed,
    };
  } catch (error) {
    logger.serviceError('ai', 'decomposeTask', error, { title });
    throw new Error("Failed to decompose task");
  }
}

export function parseMarkdownChecklist(markdown: string): DecomposedTask[] {
  const lines = markdown.trim().split('\n');
  const tasks: DecomposedTask[] = [];

  for (const line of lines) {
    const checkboxMatch = line.match(/^-\s*\[[\sx]\]\s*(.+?)(?:\s*\((\d+(?:\.\d+)?)h\))?$/i);
    
    if (checkboxMatch) {
      const title = checkboxMatch[1].trim();
      const hoursStr = checkboxMatch[2];
      const hours = hoursStr ? parseFloat(hoursStr) : 1;
      
      if (title) {
        tasks.push({ title, hours });
      }
    }
  }

  return tasks;
}

export interface TimeBlock {
  id: string;
  time: string; // Format: "08:00"
  duration: number; // in minutes
  taskId?: string;
  title: string;
  type: "task" | "habit" | "busy" | "free";
  description?: string;
}

interface DayPlanInput {
  tasks: Array<{ id: string; title: string; description?: string; priority?: string; hours?: string }>;
  habits?: Array<{ title: string; duration: number }>;
  busySlots?: Array<{ time: string; duration: number; title: string }>;
}

export async function generateDayPlan(input: DayPlanInput): Promise<TimeBlock[]> {
  const systemPrompt = `You are an AI day planner assistant. Given tasks, habits, and busy time slots, create an optimized daily schedule from 08:00 to 22:00.

Rules:
1. Schedule high-priority tasks during peak productivity hours (09:00-12:00, 14:00-17:00)
2. Include breaks between long tasks
3. Respect busy slots (don't schedule anything during them)
4. Each time block should be 30-60 minutes
5. Include buffer time for transitions
6. Return time blocks in chronological order

Return ONLY a valid JSON array of time blocks with this structure:
[
  {
    "id": "unique-id",
    "time": "HH:MM",
    "duration": 60,
    "taskId": "task-id-or-null",
    "title": "Task or activity name",
    "type": "task|habit|busy|free",
    "description": "Optional details"
  }
]`;

  const userPrompt = `Create a day plan with these inputs:

Tasks:
${input.tasks.map(t => `- ${t.title} (Priority: ${t.priority || 'medium'}, Hours: ${t.hours || '1'})`).join('\n')}

${input.habits && input.habits.length > 0 ? `Habits:
${input.habits.map(h => `- ${h.title} (${h.duration} min)`).join('\n')}` : ''}

${input.busySlots && input.busySlots.length > 0 ? `Busy Time Slots:
${input.busySlots.map(b => `- ${b.time} for ${b.duration} min: ${b.title}`).join('\n')}` : ''}

Generate an optimized daily schedule from 08:00 to 22:00.`;

  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // GPT-5 only supports default temperature of 1, cannot customize
    max_completion_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || "[]";
  
  try {
    const blocks = JSON.parse(content) as TimeBlock[];
    return blocks;
  } catch (error) {
    logger.serviceError('ai', 'generateDayPlan', error, { response: content?.substring(0, 100) });
    throw new Error("Failed to generate day plan");
  }
}

export interface ReorganizeSuggestion {
  id: string;
  quadrant: "urgent-important" | "important" | "urgent" | "not-urgent";
  reason: string;
}

interface ReorganizeInput {
  tasks: Array<{ id: string; title: string; description?: string; priority?: string; status?: string; dueDate?: string }>;
  completedRatio7d: number; // 0-1, percentage of tasks completed in last 7 days
}

export async function reorganizeTasks(input: ReorganizeInput): Promise<ReorganizeSuggestion[]> {
  const systemPrompt = `You are an AI task organizer using the Eisenhower Matrix (urgent-important framework).

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

IMPORTANT: You must provide exactly one suggestion for each task. Every task must be classified into one of the four quadrants.`;

  const userPrompt = `User's 7-day completion ratio: ${(input.completedRatio7d * 100).toFixed(0)}%

Tasks to reorganize:
${input.tasks.map((t, i) => `${i + 1}. [${t.id}] "${t.title}" (Priority: ${t.priority || 'medium'}, Status: ${t.status || 'todo'}${t.dueDate ? `, Due: ${t.dueDate}` : ''}${t.description ? `, Description: ${t.description}` : ''})`).join('\n')}

Apply Eisenhower Matrix principles and classify EACH task into the appropriate quadrant.`;

  logger.debug("Reorganizing tasks", { 
    taskCount: input.tasks.length, 
    completionRate: `${(input.completedRatio7d * 100).toFixed(0)}%` 
  });

  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content || "{}";
  logger.debug("AI reorganize response received", { preview: content.substring(0, 200) });
  
  try {
    const parsed = JSON.parse(content);
    // Handle both array and object responses
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
    logger.debug("Parsed reorganization suggestions", { count: suggestions.length });
    return suggestions as ReorganizeSuggestion[];
  } catch (error) {
    logger.serviceError('ai', 'reorganizeTasks', error, { response: content });
    throw new Error("Failed to reorganize tasks");
  }
}
