import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.taskspark.app',
  appName: 'TaskSpark AI',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // For development, you can set the URL to your local server
    // url: 'http://10.0.2.2:5000', // Android emulator localhost
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  // Deep linking configuration for opening specific tasks
  // Format: taskspark://task/{taskId}
  // Configured in AndroidManifest.xml
};

export default config;
