import { useEffect } from 'react';
import { PushNotifications, type Token, type PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const { toast } = useToast();

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initializePushNotifications = async () => {
      try {
        // Request permission to use push notifications
        const permissionResult = await PushNotifications.requestPermissions();
        
        if (permissionResult.receive === 'granted') {
          // Register with FCM
          await PushNotifications.register();
        } else {
          console.warn('Push notification permission denied');
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    const setupListeners = async () => {
      // On successful registration, send token to backend
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        
        try {
          const response = await fetch('/api/push/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token.value,
              platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
              userId: 'default',
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          console.log('Push token sent to backend');
        } catch (error) {
          console.error('Failed to send push token to backend:', error);
        }
      });

      // On registration error
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });

      // Handle notification received while app is in foreground
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push notification received:', notification);
          
          // Show toast for foreground notifications
          toast({
            title: notification.title || 'Notification',
            description: notification.body || '',
          });
        }
      );

      // Handle notification tap (app opened from notification)
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: any) => {
          console.log('Push notification action performed:', notification);
          
          const data = notification.notification?.data;
          
          // Handle deep link to specific task
          if (data?.taskId) {
            // Navigate to task detail page
            // This will be handled by deep link routing
            const deepLink = data.deepLink || `taskspark://task/${data.taskId}`;
            console.log('Opening deep link:', deepLink);
            
            // The deep link will be handled by the App component's routing
            window.location.href = `/tasks/${data.taskId}`;
          }
        }
      );
    };

    initializePushNotifications();
    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [toast]);
}
