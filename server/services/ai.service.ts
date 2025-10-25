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
  projectId?: string;
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

interface UserProject {
  id: string;
  name: string;
}

export async function parseNaturalLanguageTask(
  input: string,
  userProjects?: UserProject[]
): Promise<ParsedTask> {
  try {
    let prompt = `Parse this natural language input into a structured task in JSON format:
"${input}"

Extract:
1. title - the main task description
2. description - any additional details (optional)
3. priority - assess urgency (low, medium, or high)
4. category - categorize the task (optional)
5. projectName - if the user mentions a project, extract the project name (optional)

Return as JSON with keys: title, description, priority, category, projectName`;

    if (userProjects && userProjects.length > 0) {
      const projectsList = userProjects.map(p => `"${p.name}"`).join(", ");
      prompt += `\n\nAvailable projects: ${projectsList}
If the user mentions one of these project names (in any language), include it as "projectName" in your response.`;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === "") {
      logger.warn('parseNaturalLanguageTask: Empty content from OpenAI - using fallback parsing', { input });
      
      // Fallback: Use simple string processing to extract task and project
      let title = input;
      let projectId: string | undefined;
      
      // Remove task creation keywords from title
      const taskKeywordsToRemove = [
        'создай задачу', 'создать задачу', 'добавь задачу', 'добавить задачу',
        'новая задача', 'новую задачу', 'напомни мне', 'напомнить мне',
        'create task', 'add task', 'new task', 'remind me to', 'i need to',
        'create a task', 'add a task'
      ];
      
      let cleanTitle = title.toLowerCase();
      for (const keyword of taskKeywordsToRemove) {
        if (cleanTitle.startsWith(keyword)) {
          title = title.substring(keyword.length).trim();
          cleanTitle = title.toLowerCase();
          break;
        }
      }
      
      // Try to extract project name
      if (userProjects && userProjects.length > 0) {
        const projectKeywords = ['в проекте', 'in project', 'for project', 'to project'];
        
        for (const keyword of projectKeywords) {
          const keywordIndex = cleanTitle.indexOf(keyword);
          if (keywordIndex !== -1) {
            const afterKeyword = title.substring(keywordIndex + keyword.length).trim();
            
            // Try to match each user project
            for (const project of userProjects) {
              if (afterKeyword.toLowerCase().startsWith(project.name.toLowerCase())) {
                projectId = project.id;
                // Remove project mention from title
                title = title.substring(0, keywordIndex).trim();
                logger.info('parseNaturalLanguageTask: Fallback extracted project', {
                  projectName: project.name,
                  projectId,
                  originalTitle: input,
                  cleanedTitle: title
                });
                break;
              }
            }
            if (projectId) break;
          }
        }
      }
      
      return {
        title: title || input,
        priority: "medium",
        projectId,
      };
    }

    logger.info('parseNaturalLanguageTask: OpenAI raw response', {
      content,
      inputLength: input.length
    });

    const parsed = JSON.parse(content) as ParsedTask & { projectName?: string };
    
    logger.info('parseNaturalLanguageTask: Parsed response', {
      parsed,
      hasProjectName: !!parsed.projectName,
      hasUserProjects: !!userProjects,
      userProjectCount: userProjects?.length || 0
    });
    
    // Match projectName to projectId if available
    if (parsed.projectName && userProjects) {
      logger.info('parseNaturalLanguageTask: Attempting project match', {
        projectName: parsed.projectName,
        availableProjects: userProjects.map(p => p.name)
      });
      
      const matchedProject = userProjects.find(
        p => p.name.toLowerCase() === parsed.projectName?.toLowerCase()
      );
      
      if (matchedProject) {
        parsed.projectId = matchedProject.id;
        logger.info('parseNaturalLanguageTask: Project matched!', {
          projectName: parsed.projectName,
          matchedProjectId: matchedProject.id
        });
      } else {
        logger.warn('parseNaturalLanguageTask: No project match found', {
          projectName: parsed.projectName,
          availableProjects: userProjects.map(p => ({ id: p.id, name: p.name }))
        });
      }
    }

    logger.info('parseNaturalLanguageTask: Final result', {
      title: parsed.title,
      hasProjectId: !!parsed.projectId,
      projectId: parsed.projectId
    });

    return parsed;
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
  tasks: TaskSummary[],
  userProjects?: UserProject[]
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
    const taskKeywords = [
      // English keywords
      "create task", "add task", "new task", "remind me to", "i need to", "todo", "create a task", "add a task",
      // Russian keywords (Русский)
      "создай задачу", "создать задачу", "добавь задачу", "добавить задачу", 
      "новая задача", "новую задачу", "напомни мне", "напомнить мне", "мне нужно", "нужно сделать"
    ];
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
      logger.info('AI Chat: Parsing natural language task', {
        hasProjects: !!userProjects,
        projectCount: userProjects?.length || 0
      });
      taskSuggestion = await parseNaturalLanguageTask(message, userProjects);
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

CRITICAL: The response must be a valid JSON array. Include at least one time block for each task provided.`;

  const userPrompt = `Create a day plan with these inputs:

Tasks to schedule:
${input.tasks.map((t, i) => `${i + 1}. ID: ${t.id}, Title: "${t.title}", Priority: ${t.priority || 'medium'}, Hours: ${t.hours || '1'}`).join('\n')}

${input.habits && input.habits.length > 0 ? `Habits:
${input.habits.map(h => `- ${h.title} (${h.duration} min)`).join('\n')}` : ''}

${input.busySlots && input.busySlots.length > 0 ? `Busy Time Slots:
${input.busySlots.map(b => `- ${b.time} for ${b.duration} min: ${b.title}`).join('\n')}` : ''}

Generate an optimized daily schedule from 08:00 to 22:00. Include ALL ${input.tasks.length} tasks in the schedule.`;

  logger.debug("Generating day plan", { 
    taskCount: input.tasks.length,
    tasks: input.tasks.map(t => t.title)
  });

  try {
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
    
    logger.debug("Day plan AI response received", { 
      responseLength: content.length,
      preview: content.substring(0, 200)
    });
    
    // Try to parse the response
    let blocks: TimeBlock[] = [];
    
    try {
      blocks = JSON.parse(content) as TimeBlock[];
    } catch (parseError) {
      logger.serviceError('ai', 'generateDayPlan - JSON parse failed', parseError, { 
        response: content?.substring(0, 500) 
      });
      // Fall through to fallback
    }

    // If AI returned empty array or parsing failed, use fallback
    if (!blocks || blocks.length === 0) {
      logger.warn("AI returned empty day plan, using fallback generator");
      blocks = generateFallbackDayPlan(input);
    }

    logger.info("Day plan generated successfully", { blockCount: blocks.length });
    return blocks;
    
  } catch (error) {
    logger.serviceError('ai', 'generateDayPlan - API call failed', error);
    // Use fallback on any error
    logger.warn("Using fallback day plan due to API error");
    return generateFallbackDayPlan(input);
  }
}

// Fallback day plan generator when AI fails or returns empty results
function generateFallbackDayPlan(input: DayPlanInput): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentTime = 8 * 60; // Start at 08:00 (in minutes)
  const endTime = 22 * 60; // End at 22:00 (in minutes)
  
  logger.debug("Generating fallback day plan", { taskCount: input.tasks.length });

  // Sort tasks by priority (high first)
  const sortedTasks = [...input.tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
    return aPriority - bPriority;
  });

  // Schedule each task
  for (const task of sortedTasks) {
    if (currentTime >= endTime) break;

    const hours = parseFloat(task.hours || '1');
    const duration = Math.min(Math.round(hours * 60), 120); // Max 2 hours per block
    
    const blockTime = formatMinutesToTime(currentTime);
    
    blocks.push({
      id: `block-${task.id}`,
      time: blockTime,
      duration: duration,
      taskId: task.id,
      title: task.title,
      type: "task",
      description: task.description
    });

    currentTime += duration;
    
    // Add 10-minute break between tasks
    if (currentTime < endTime - 10) {
      currentTime += 10;
    }
  }

  return blocks;
}

// Helper function to format minutes to HH:MM
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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

CRITICAL: You MUST provide exactly one suggestion for each task. Every task must be classified into one of the four quadrants. Do not return an empty array.`;

  const userPrompt = `User's 7-day completion ratio: ${(input.completedRatio7d * 100).toFixed(0)}%

Tasks to reorganize (you MUST classify ALL ${input.tasks.length} tasks):
${input.tasks.map((t, i) => `${i + 1}. [${t.id}] "${t.title}" (Priority: ${t.priority || 'medium'}, Status: ${t.status || 'todo'}${t.dueDate ? `, Due: ${t.dueDate}` : ''}${t.description ? `, Description: ${t.description}` : ''})`).join('\n')}

Apply Eisenhower Matrix principles and classify EACH of the ${input.tasks.length} tasks into the appropriate quadrant. Return ${input.tasks.length} suggestions.`;

  logger.debug("Reorganizing tasks", { 
    taskCount: input.tasks.length, 
    completionRate: `${(input.completedRatio7d * 100).toFixed(0)}%`,
    tasks: input.tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority }))
  });

  try {
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
    logger.debug("AI reorganize response received", { 
      responseLength: content.length,
      preview: content.substring(0, 200) 
    });
    
    let suggestions: ReorganizeSuggestion[] = [];
    
    try {
      const parsed = JSON.parse(content);
      // Handle both array and object responses
      suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
    } catch (parseError) {
      logger.serviceError('ai', 'reorganizeTasks - JSON parse failed', parseError, { 
        response: content?.substring(0, 500) 
      });
      // Fall through to fallback
    }

    // If AI returned empty array or parsing failed, use fallback
    if (!suggestions || suggestions.length === 0) {
      logger.warn("AI returned empty reorganization suggestions, using fallback");
      suggestions = generateFallbackReorganization(input);
    }

    logger.info("Task reorganization completed", { 
      suggestionCount: suggestions.length,
      requestedCount: input.tasks.length 
    });
    
    return suggestions;
    
  } catch (error) {
    logger.serviceError('ai', 'reorganizeTasks - API call failed', error);
    // Use fallback on any error
    logger.warn("Using fallback reorganization due to API error");
    return generateFallbackReorganization(input);
  }
}

// Fallback reorganization when AI fails or returns empty results
function generateFallbackReorganization(input: ReorganizeInput): ReorganizeSuggestion[] {
  logger.debug("Generating fallback reorganization", { taskCount: input.tasks.length });
  
  const suggestions: ReorganizeSuggestion[] = [];
  const now = new Date();

  for (const task of input.tasks) {
    const priority = task.priority || 'medium';
    const status = task.status || 'todo';
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    // Check if task is overdue or due soon (within 3 days)
    const isOverdue = dueDate && dueDate < now;
    const isDueSoon = dueDate && !isOverdue && dueDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const isUrgent = isOverdue || isDueSoon;
    
    // Determine quadrant based on priority and urgency
    let quadrant: ReorganizeSuggestion['quadrant'];
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
    
    suggestions.push({
      id: task.id,
      quadrant,
      reason
    });
  }
  
  return suggestions;
}
