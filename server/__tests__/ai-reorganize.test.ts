import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../routes';
import type { Server } from 'http';

describe('POST /api/ai/reorganize', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(() => {
    server.close();
  });

  it('should return 400 when taskIds is missing', async () => {
    const response = await request(app)
      .post('/api/ai/reorganize')
      .send({});

    expect(response.status).toBe(400);
  });

  it('should return 400 when taskIds is empty array', async () => {
    const response = await request(app)
      .post('/api/ai/reorganize')
      .send({ taskIds: [] });

    expect(response.status).toBe(400);
  });

  it('should return 400 when taskIds is not an array', async () => {
    const response = await request(app)
      .post('/api/ai/reorganize')
      .send({ taskIds: 'invalid' });

    expect(response.status).toBe(400);
  });

  it('should return suggestions for valid task IDs', async () => {
    // First, create some test tasks
    const task1 = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Important urgent task',
        priority: 'high',
        status: 'todo',
      });

    const task2 = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Low priority task',
        priority: 'low',
        status: 'todo',
      });

    expect(task1.status).toBe(201);
    expect(task2.status).toBe(201);

    const taskIds = [task1.body.id, task2.body.id];

    const response = await request(app)
      .post('/api/ai/reorganize')
      .send({ taskIds });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('suggestions');
    expect(response.body).toHaveProperty('completedRatio7d');
    expect(response.body).toHaveProperty('usage');
    
    expect(Array.isArray(response.body.suggestions)).toBe(true);
    
    // Verify usage info
    expect(response.body.usage).toHaveProperty('remaining');
    expect(response.body.usage).toHaveProperty('limit');
    expect(response.body.usage.limit).toBe(1);

    // Clean up
    await request(app).delete(`/api/tasks/${task1.body.id}`);
    await request(app).delete(`/api/tasks/${task2.body.id}`);
  }, 30000);

  it('should include action and reason in suggestions', async () => {
    const task = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Test task for reorganization',
        priority: 'medium',
        status: 'todo',
      });

    const response = await request(app)
      .post('/api/ai/reorganize')
      .send({ taskIds: [task.body.id] });

    expect(response.status).toBe(200);
    
    if (response.body.suggestions.length > 0) {
      const suggestion = response.body.suggestions[0];
      expect(suggestion).toHaveProperty('id');
      expect(suggestion).toHaveProperty('action');
      expect(suggestion).toHaveProperty('reason');
      expect(['defer', 'delete', 'delegate']).toContain(suggestion.action);
      expect(typeof suggestion.reason).toBe('string');
    }

    // Clean up
    await request(app).delete(`/api/tasks/${task.body.id}`);
  }, 30000);
});

describe('PATCH /api/tasks/bulk', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(() => {
    server.close();
  });

  it('should return 400 when updates array is missing', async () => {
    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({});

    expect(response.status).toBe(400);
  });

  it('should return 400 when updates is not an array', async () => {
    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({ updates: 'invalid' });

    expect(response.status).toBe(400);
  });

  it('should bulk update multiple tasks', async () => {
    // Create test tasks
    const task1 = await request(app)
      .post('/api/tasks')
      .send({ title: 'Task 1', priority: 'high', status: 'todo' });

    const task2 = await request(app)
      .post('/api/tasks')
      .send({ title: 'Task 2', priority: 'high', status: 'todo' });

    expect(task1.status).toBe(201);
    expect(task2.status).toBe(201);

    // Bulk update both tasks
    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({
        updates: [
          {
            id: task1.body.id,
            updates: { priority: 'low', status: 'archived' },
          },
          {
            id: task2.body.id,
            updates: { priority: 'low' },
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count');
    expect(response.body.count).toBe(2);
    expect(response.body).toHaveProperty('tasks');
    expect(Array.isArray(response.body.tasks)).toBe(true);
    expect(response.body.tasks.length).toBe(2);

    // Verify updates were applied
    const updatedTask1 = await request(app).get(`/api/tasks/${task1.body.id}`);
    expect(updatedTask1.body.priority).toBe('low');
    expect(updatedTask1.body.status).toBe('archived');

    const updatedTask2 = await request(app).get(`/api/tasks/${task2.body.id}`);
    expect(updatedTask2.body.priority).toBe('low');

    // Clean up
    await request(app).delete(`/api/tasks/${task1.body.id}`);
    await request(app).delete(`/api/tasks/${task2.body.id}`);
  });

  it('should handle partial failures gracefully', async () => {
    const task = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test task', priority: 'high', status: 'todo' });

    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({
        updates: [
          {
            id: task.body.id,
            updates: { priority: 'low' },
          },
          {
            id: 'nonexistent-id',
            updates: { priority: 'low' },
          },
        ],
      });

    // Should still succeed for valid tasks
    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThan(0);

    // Clean up
    await request(app).delete(`/api/tasks/${task.body.id}`);
  });
});
