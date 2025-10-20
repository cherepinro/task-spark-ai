import * as admin from 'firebase-admin';
import { logger } from './logger.service';

let isInitialized = false;

export interface PushNotificationData {
  title: string;
  body: string;
  taskId: string;
  deepLink?: string;
}

class FirebaseService {
  initialize() {
    if (isInitialized) {
      return;
    }

    try {
      // Check if Firebase credentials are available
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      
      if (!serviceAccountJson) {
        logger.warn('Firebase service account not configured. Push notifications will not work.');
        logger.warn('Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable with your Firebase service account JSON');
        return;
      }

      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      isInitialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async sendPushNotification(token: string, data: PushNotificationData): Promise<boolean> {
    if (!isInitialized) {
      logger.warn('Firebase not initialized. Cannot send push notification.');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: data.title,
          body: data.body,
        },
        data: {
          taskId: data.taskId,
          deepLink: data.deepLink || `taskspark://task/${data.taskId}`,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Android
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'task_reminders',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      logger.info('Push notification sent successfully', { messageId: response, taskId: data.taskId });
      return true;
    } catch (error) {
      logger.error('Failed to send push notification', error, { token, taskId: data.taskId });
      
      // If token is invalid, we should probably delete it from database
      if (error instanceof Error && error.message.includes('registration-token-not-registered')) {
        logger.warn('Token is invalid/unregistered', { token });
        // Caller should handle token deletion
      }
      
      return false;
    }
  }

  async sendMulticastNotification(tokens: string[], data: PushNotificationData): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    if (!isInitialized) {
      logger.warn('Firebase not initialized. Cannot send push notifications.');
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: data.title,
          body: data.body,
        },
        data: {
          taskId: data.taskId,
          deepLink: data.deepLink || `taskspark://task/${data.taskId}`,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'task_reminders',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[idx]);
        }
      });

      logger.info('Multicast push notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens: invalidTokens.length,
        taskId: data.taskId,
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logger.error('Failed to send multicast push notification', error, { taskId: data.taskId });
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }

  isReady(): boolean {
    return isInitialized;
  }

  /**
   * Verify a Firebase ID token
   * @param idToken Firebase ID token from client
   * @returns Decoded token with user info or null if invalid
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
    if (!isInitialized) {
      logger.warn('Firebase not initialized. Cannot verify ID token.');
      return null;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Failed to verify Firebase ID token', error);
      return null;
    }
  }

  /**
   * Create a custom token for a user (for email/password auth)
   * @param uid User ID
   * @returns Custom token
   */
  async createCustomToken(uid: string): Promise<string | null> {
    if (!isInitialized) {
      logger.warn('Firebase not initialized. Cannot create custom token.');
      return null;
    }

    try {
      const customToken = await admin.auth().createCustomToken(uid);
      return customToken;
    } catch (error) {
      logger.error('Failed to create custom token', error);
      return null;
    }
  }

  /**
   * Get Firebase user by email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    if (!isInitialized) {
      return null;
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      // User doesn't exist in Firebase yet
      return null;
    }
  }

  /**
   * Create a Firebase user
   */
  async createUser(email: string, password?: string, displayName?: string): Promise<admin.auth.UserRecord | null> {
    if (!isInitialized) {
      return null;
    }

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });
      return userRecord;
    } catch (error) {
      logger.error('Failed to create Firebase user', error);
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();
