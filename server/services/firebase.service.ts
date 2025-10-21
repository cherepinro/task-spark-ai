import admin from 'firebase-admin';
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

      logger.info('🔧 Parsing Firebase service account JSON...');
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
        logger.info('✅ Service account JSON parsed successfully', {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email
        });
      } catch (parseError: any) {
        logger.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', {
          error: parseError.message,
          jsonLength: serviceAccountJson.length,
          jsonPreview: serviceAccountJson.substring(0, 100)
        });
        return;
      }

      // Validate service account structure
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        logger.error('❌ Invalid service account JSON - missing required fields', {
          hasProjectId: !!serviceAccount.project_id,
          hasPrivateKey: !!serviceAccount.private_key,
          hasClientEmail: !!serviceAccount.client_email
        });
        return;
      }

      logger.info('🔧 Initializing Firebase Admin SDK...');
      
      // Check if admin.credential exists
      if (!admin.credential) {
        logger.error('❌ admin.credential is undefined - firebase-admin module may not be loaded correctly');
        logger.error('Debugging info:', {
          adminType: typeof admin,
          adminKeys: Object.keys(admin).slice(0, 10),
          hasInitializeApp: typeof admin.initializeApp
        });
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      isInitialized = true;
      logger.info('✅ Firebase Admin SDK initialized successfully');
    } catch (error: any) {
      logger.error('❌ Failed to initialize Firebase Admin SDK', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
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
      logger.error('❌ Firebase Admin SDK NOT initialized - cannot verify ID token');
      logger.error('🔧 Solution: Set FIREBASE_SERVICE_ACCOUNT_JSON in Replit Secrets');
      return null;
    }

    try {
      logger.info('🔍 Attempting to verify Firebase ID token...');
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      logger.info('✅ Firebase ID token verified successfully', { 
        email: decodedToken.email,
        uid: decodedToken.uid 
      });
      return decodedToken;
    } catch (error: any) {
      logger.error('❌ Failed to verify Firebase ID token', { 
        error: error.message,
        code: error.code,
        stack: error.stack 
      });
      
      // Provide specific error guidance
      if (error.code === 'auth/argument-error') {
        logger.error('🔧 Token format is invalid - check frontend Firebase initialization');
      } else if (error.code === 'auth/id-token-expired') {
        logger.error('🔧 Token has expired - user needs to sign in again');
      } else if (error.code === 'auth/invalid-id-token') {
        logger.error('🔧 Token is invalid - check Firebase project configuration');
      }
      
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
