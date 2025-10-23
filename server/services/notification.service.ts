import { storage } from '../storage';
import { firebaseService, type PushNotificationData } from './firebase.service';
import { logger } from './logger.service';
import type { Task } from '@shared/schema';

class NotificationService {
  async sendTaskDueNotification(task: Task): Promise<void> {
    try {
      // Get all push tokens for the user
      const tokens = await storage.getAllPushTokens(task.userId);
      
      if (tokens.length === 0) {
        logger.debug('No push tokens found for user', { taskId: task.id });
        return;
      }

      const tokenStrings = tokens.map(t => t.token);
      
      const notificationData: PushNotificationData = {
        title: '📋 Task Due!',
        body: task.title,
        taskId: task.id,
        deepLink: `taskspark://task/${task.id}`,
      };

      // Send to all user's devices
      const result = await firebaseService.sendMulticastNotification(tokenStrings, notificationData);
      
      // Clean up invalid tokens
      if (result.invalidTokens.length > 0) {
        logger.info('Cleaning up invalid push tokens', { count: result.invalidTokens.length });
        for (const invalidToken of result.invalidTokens) {
          await storage.deletePushToken(invalidToken);
        }
      }

      logger.info('Task due notification sent', {
        taskId: task.id,
        successCount: result.successCount,
        failureCount: result.failureCount,
      });
    } catch (error) {
      logger.error('Failed to send task due notification', error, { taskId: task.id });
    }
  }

  async checkAndSendDueTaskNotifications(): Promise<void> {
    try {
      const now = new Date();

      // Get all incomplete tasks
      const allTasks = await storage.getAllTasks({ status: 'todo' });
      const tasksToNotify = allTasks.filter(task => {
        // Skip if task is completed or archived
        if (task.status === 'completed' || task.status === 'archived') {
          return false;
        }

        // Determine the deadline (prefer deadlineDateTime, fallback to dueDate)
        const deadline = task.deadlineDateTime || task.dueDate;
        if (!deadline) {
          return false;
        }

        const deadlineDate = new Date(deadline);
        
        // Determine notification window based on per-task settings
        let hoursBeforeDeadline = 1; // Default: 1 hour before deadline
        
        // If task has custom reminder settings enabled, use them
        if (task.enableReminder === true && task.reminderHoursBefore && task.reminderHoursBefore > 0) {
          hoursBeforeDeadline = task.reminderHoursBefore;
        }
        
        const notificationTime = new Date(deadlineDate.getTime() - hoursBeforeDeadline * 60 * 60 * 1000);
        
        // Send notification if current time is past the notification time but before deadline
        return now >= notificationTime && now < deadlineDate;
      });

      if (tasksToNotify.length === 0) {
        logger.debug('No tasks to notify');
        return;
      }

      logger.info('Sending due task notifications', { count: tasksToNotify.length });

      // Send notification for each task
      for (const task of tasksToNotify) {
        await this.sendTaskDueNotification(task);
      }
    } catch (error) {
      logger.error('Failed to check and send due task notifications', error);
    }
  }
}

export const notificationService = new NotificationService();
