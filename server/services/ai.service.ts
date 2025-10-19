import OpenAI from "openai";
import type { InsertTask } from "@shared/schema";

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
    console.error("AI analysis error:", error);
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
    console.error("AI parsing error:", error);
    return {
      title: input,
      priority: "medium",
    };
  }
}

export async function generateProductivityInsight(
  tasks: any[]
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
    console.error("AI insight generation error:", error);
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
  tasks: any[]
): Promise<ChatResponse> {
  const taskSummary = tasks.length > 0 
    ? tasks.slice(0, 3).map(t => `${t.title} (${t.priority}, ${t.status})`).join(', ')
    : "no tasks";

  const systemPrompt = `You are TaskSpark AI, a task management assistant. Current tasks: ${taskSummary}. Be concise and helpful.`;

  // Filter out any messages with invalid content
  const validHistory = conversationHistory.filter(
    (msg) => msg.content && typeof msg.content === "string" && msg.content.trim() !== ""
  );

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...validHistory,
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    max_completion_tokens: 1000,
  });

  const aiMessage = response.choices[0]?.message?.content || "I'm here to help with your tasks!";

  // Check if the message contains a task creation intent
  const taskKeywords = ["create task", "add task", "new task", "remind me to", "i need to", "todo"];
  const containsTaskIntent = taskKeywords.some(keyword => message.toLowerCase().includes(keyword));

  let taskSuggestion: ParsedTask | undefined;
  if (containsTaskIntent) {
    taskSuggestion = await parseNaturalLanguageTask(message);
  }

  return {
    message: aiMessage,
    taskSuggestion,
  };
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
    console.error("Task decomposition error:", error);
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
    console.error("[generateDayPlan] Failed to parse AI response:", content);
    throw new Error("Failed to generate day plan");
  }
}
