# Push Notifications Setup Guide

This guide explains how to configure Firebase Cloud Messaging (FCM) push notifications for TaskSpark AI Android app.

## Overview

TaskSpark AI uses Firebase Cloud Messaging (FCM) to send push notifications for:
- Tasks due soon (within 1 hour)
- Important task reminders
- AI insights and suggestions

The system consists of:
- **Backend**: Express + Firebase Admin SDK for sending notifications
- **Frontend**: React + Capacitor Push Notifications plugin for receiving
- **Database**: PostgreSQL storing FCM tokens
- **Deep Links**: Open specific tasks from notifications (`taskspark://task/{taskId}`)

## Prerequisites

1. **Firebase Project**: Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Android App**: Register your Android app in Firebase Console
3. **Service Account**: Download Firebase service account JSON

## Backend Setup

### 1. Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Set environment variable:

```bash
# On Replit: Use Secrets (lock icon in sidebar)
FIREBASE_SERVICE_ACCOUNT_JSON=<paste entire JSON content here>
```

### 2. Backend Code (Already Implemented)

The backend is ready with:
- ✅ `server/services/firebase.service.ts` - Firebase Admin SDK integration
- ✅ `server/services/notification.service.ts` - Send notifications for due tasks
- ✅ `server/routes.ts` - API endpoints:
  - `POST /api/push/token` - Register FCM token
  - `DELETE /api/push/token` - Delete FCM token
- ✅ `shared/schema.ts` - `push_tokens` table for storing tokens

## Android Setup

### 1. Download google-services.json

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" section
3. Select your Android app (or add one with package name `ai.taskspark.app`)
4. Click "Download google-services.json"
5. Place file at: `android/app/google-services.json`

### 2. Update AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <!-- Existing activity -->
        <activity android:name=".MainActivity">
            <!-- Add deep link intent filter -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="taskspark" android:host="task" />
            </intent-filter>
        </activity>

        <!-- Firebase Cloud Messaging -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Notification channel metadata -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/purple" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="task_reminders" />
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

### 3. Update build.gradle

Add to `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.google.firebase:firebase-messaging:23.3.1'
}

// Add at the bottom
apply plugin: 'com.google.gms.google-services'
```

Add to `android/build.gradle` (project level):

```gradle
buildscript {
    dependencies {
        // ... existing dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### 4. Create Notification Icon (Optional)

Create a notification icon at `android/app/src/main/res/drawable/ic_notification.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="?attr/colorControlNormal">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.9,2 2,2zM18,16v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z"/>
</vector>
```

## Frontend Setup (Already Implemented)

The frontend is ready with:
- ✅ `client/src/hooks/usePushNotifications.ts` - React hook for registering push notifications
- ✅ `capacitor.config.ts` - Capacitor configuration with deep links

### Usage in App

The hook is automatically initialized in the App component:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function App() {
  usePushNotifications(); // Automatically registers for push notifications
  // ...
}
```

## Testing Push Notifications

### 1. Test Token Registration

1. Build and run Android app: `npm run android`
2. Check console logs for: "Push registration success, token: ..."
3. Verify token in database:

```sql
SELECT * FROM push_tokens;
```

### 2. Test Sending Notification

Use Firebase Console to send test notification:

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and body
4. Select your app
5. Send

Or test via backend API:

```bash
# Create a task due in 1 hour
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test notification task",
    "priority": "high",
    "status": "todo",
    "dueDate": "2025-10-19T15:00:00Z"
  }'
```

### 3. Test Deep Links

Send notification with deep link:

```bash
# The notification service automatically includes deep links
# Format: taskspark://task/{taskId}
```

Tap notification → App opens → Navigates to task detail page

## Notification Service

The backend automatically checks for due tasks and sends notifications:

```typescript
// server/services/notification.service.ts
await notificationService.checkAndSendDueTaskNotifications();
```

You can run this:
- On a schedule (cron job)
- When tasks are created/updated
- Manually via API endpoint

## Troubleshooting

### Token Not Registering

1. Check Firebase credentials are set correctly
2. Verify `google-services.json` is in correct location
3. Check Android logs: `npx cap run android --livereload`

### Notifications Not Received

1. Verify token exists in database
2. Check Firebase Admin SDK is initialized (backend logs)
3. Test with Firebase Console test message
4. Check Android notification settings (app permissions)

### Deep Links Not Working

1. Verify `AndroidManifest.xml` has intent filter
2. Check `capacitor.config.ts` has correct scheme
3. Test deep link manually: `adb shell am start -W -a android.intent.action.VIEW -d "taskspark://task/123" ai.taskspark.app`

## Security Notes

1. **Never commit** `google-services.json` or service account JSON to version control
2. Use environment variables for Firebase credentials
3. Validate FCM tokens server-side before storing
4. Implement rate limiting on notification endpoints
5. Clean up invalid/expired tokens automatically

## Architecture

```
┌─────────────────┐
│   Android App   │
│   (Capacitor)   │
└────────┬────────┘
         │ FCM Token
         ▼
┌─────────────────┐
│  Express API    │
│  POST /api/push │
│     /token      │
└────────┬────────┘
         │ Store
         ▼
┌─────────────────┐
│   PostgreSQL    │
│  push_tokens    │
└─────────────────┘

         │ Read tokens
         ▼
┌─────────────────┐
│ Firebase Admin  │
│      SDK        │
└────────┬────────┘
         │ Send FCM
         ▼
┌─────────────────┐
│  Firebase FCM   │
│     Service     │
└────────┬────────┘
         │ Deliver
         ▼
┌─────────────────┐
│   Android App   │
│  (Notification) │
└─────────────────┘
```

## Next Steps

1. ✅ Backend infrastructure complete
2. ✅ Frontend hooks implemented
3. ⏳ Configure Firebase project
4. ⏳ Add `google-services.json`
5. ⏳ Update Android manifest
6. ⏳ Test on device
7. ⏳ Schedule notification checks (cron)
8. ⏳ Implement notification preferences UI
