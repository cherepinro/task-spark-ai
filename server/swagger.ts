export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "TaskSpark AI API",
    version: "1.0.0",
    description: "AI-powered task management API with intelligent decomposition, natural language processing, and productivity insights",
  },
  servers: [
    {
      url: "/api",
      description: "API server",
    },
  ],
  paths: {
    "/ai/decompose": {
      post: {
        summary: "Decompose task into subtasks",
        description: "Uses AI to split a complex task into 3-7 smaller subtasks with estimated hours. Includes caching (90-day TTL) and quota enforcement (5 calls/month).",
        tags: ["AI"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: {
                    type: "string",
                    description: "The task title to decompose",
                    example: "Build a mobile app",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful decomposition",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            description: "Task ID in database",
                          },
                          title: {
                            type: "string",
                            description: "Subtask title",
                          },
                          hours: {
                            type: "number",
                            description: "Estimated hours",
                          },
                        },
                      },
                    },
                    tokensUsed: {
                      type: "number",
                      description: "OpenAI tokens consumed",
                    },
                    remainingQuota: {
                      type: "number",
                      description: "Remaining API calls this month",
                    },
                    fromCache: {
                      type: "boolean",
                      description: "Whether result was served from cache",
                    },
                  },
                },
                example: {
                  tasks: [
                    { id: "abc123", title: "Design UI mockups", hours: 4 },
                    { id: "def456", title: "Implement backend API", hours: 8 },
                    { id: "ghi789", title: "Write tests", hours: 3 },
                  ],
                  tokensUsed: 450,
                  remainingQuota: 4,
                },
              },
            },
          },
          "400": {
            description: "Invalid request - title is required",
          },
          "429": {
            description: "Monthly quota exceeded (5 calls/month limit)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                    },
                    remainingQuota: {
                      type: "number",
                    },
                    callCount: {
                      type: "number",
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error during decomposition",
          },
        },
      },
    },
    "/tasks": {
      get: {
        summary: "Get all tasks",
        description: "Retrieve all tasks with optional filtering",
        tags: ["Tasks"],
        parameters: [
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by title or description",
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string", enum: ["low", "medium", "high"] },
            description: "Filter by priority",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["todo", "in-progress", "completed", "archived"] },
            description: "Filter by status",
          },
          {
            name: "projectId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by project ID",
          },
        ],
        responses: {
          "200": {
            description: "List of tasks",
          },
        },
      },
      post: {
        summary: "Create a new task",
        tags: ["Tasks"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  status: { type: "string", enum: ["todo", "in-progress", "completed", "archived"] },
                  dueDate: { type: "string", format: "date-time" },
                  projectId: { type: "string" },
                  hours: { type: "number", description: "Estimated hours for task" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created",
          },
        },
      },
    },
    "/ai/chat": {
      post: {
        summary: "Chat with AI assistant",
        description: "Natural language conversation with task management AI",
        tags: ["AI"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string" },
                  conversationHistory: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string", enum: ["user", "assistant"] },
                        content: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI response",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Task: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["todo", "in-progress", "completed", "archived"] },
          dueDate: { type: "string", format: "date-time" },
          projectId: { type: "string" },
          hours: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
