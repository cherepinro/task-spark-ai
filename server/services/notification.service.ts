import { storage } from '../storage';
import { firebaseService, type PushNotificationData } from './firebase.service';
import { logger } from './logger.service';
import type { Task } from '@shared/schema';

class NotificationService {
  async sendTaskDueNotification(task: Task): Promise<void> {
    try {
      // Get all push tokens for the user
      const tokens = await storage.getAllPushTokens(task.userId || 'default');
      
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
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Get all tasks due in the next hour that haven't been completed
      const allTasks = await storage.getAllTasks({ status: 'todo' });
      const dueSoonTasks = allTasks.filter(task => {
        if (!task.dueDate || task.status === 'completed' || task.status === 'archived') {
          return false;
        }
        const dueDate = new Date(task.dueDate);
        return dueDate >= now && dueDate <= oneHourFromNow;
      });

      if (dueSoonTasks.length === 0) {
        logger.debug('No tasks due soon');
        return;
      }

      logger.info('Sending notifications for due tasks', { count: dueSoonTasks.length });

      // Send notification for each due task
      for (const task of dueSoonTasks) {
        await this.sendTaskDueNotification(task);
      }
    } catch (error) {
      logger.error('Failed to check and send due task notifications', error);
    }
  }
}

export const notificationService = new NotificationService();
