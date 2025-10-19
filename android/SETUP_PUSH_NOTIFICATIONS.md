# Android Push Notifications Configuration

This guide provides the exact steps to configure Firebase Cloud Messaging (FCM) push notifications for the TaskSpark AI Android app.

## Prerequisites

1. Firebase project created at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Android app registered in Firebase with package name: `ai.taskspark.app`

## Step 1: Download google-services.json

1. Go to Firebase Console → Project Settings → General
2. Under "Your apps", select the Android app icon
3. Click "Download google-services.json"
4. **Place the file at**: `android/app/google-services.json`

## Step 2: Update AndroidManifest.xml

Edit `android/app/src/main/AndroidManifest.xml` and add the following:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Deep Link Intent Filter for taskspark://task/{taskId} -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="taskspark" android:host="task" />
            </intent-filter>
        </activity>

        <!-- Firebase Cloud Messaging Service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Notification Icon and Channel Configuration -->
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
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
</manifest>
```

## Step 3: Update build.gradle (App Level)

Edit `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'

android {
    namespace "ai.taskspark.app"
    compileSdkVersion rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "ai.taskspark.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
    
    // Firebase Cloud Messaging
    implementation 'com.google.firebase:firebase-messaging:23.3.1'
}

// Add at the bottom of the file
apply plugin: 'com.google.gms.google-services'
```

## Step 4: Update build.gradle (Project Level)

Edit `android/build.gradle`:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
        classpath 'com.google.gms:google-services:4.4.0'
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
```

## Step 5: Add Color Resources

Create or edit `android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="purple">#9333EA</color>
</resources>
```

## Step 6: Add Notification Icon (Optional but Recommended)

Create `android/app/src/main/res/drawable/ic_notification.xml`:

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

Or use a simple drawable:

Create `android/app/src/main/res/drawable-v24/ic_notification.png` (24x24 white icon on transparent background)

## Step 7: Build and Test

1. Sync Capacitor:
   ```bash
   npx cap sync android
   ```

2. Open Android Studio:
   ```bash
   npx cap open android
   ```

3. Build and run the app on a device or emulator

4. Check logs for push token registration:
   ```
   Push registration success, token: ...
   Push token sent to backend
   ```

## Testing Push Notifications

### Test 1: Token Registration

1. Run the app
2. Open browser console (if using web) or Android logcat
3. Look for: "Push registration success, token: ..."
4. Verify token is stored in database:
   ```sql
   SELECT * FROM push_tokens;
   ```

### Test 2: Send Test Notification via Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Click "Send test message"
5. Paste your FCM token
6. Click "Test"

### Test 3: Send Notification from Backend

Create a task due within 1 hour:

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test push notification",
    "priority": "high",
    "status": "todo",
    "dueDate": "2025-10-19T15:00:00Z"
  }'
```

Then trigger notification check (you'll need to add this endpoint or use a scheduler):

```typescript
// In your server, call:
import { notificationService } from './services/notification.service';
await notificationService.checkAndSendDueTaskNotifications();
```

### Test 4: Deep Links

1. Send a notification with deep link
2. Tap notification
3. App should open and navigate to the specific task

Test manually:
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "taskspark://task/YOUR_TASK_ID" \
  ai.taskspark.app
```

## Troubleshooting

### Token Not Generated

1. Check `google-services.json` is in the correct location
2. Verify package name matches: `ai.taskspark.app`
3. Check Android manifest has `POST_NOTIFICATIONS` permission
4. For Android 13+, ensure runtime permission is granted

### Notifications Not Received

1. Check notification channel is created (automatic in Android 8+)
2. Verify app has notification permissions enabled in system settings
3. Check Firebase Admin SDK is initialized on backend
4. Test with Firebase Console first before testing backend

### Deep Links Not Working

1. Verify intent filter in AndroidManifest.xml
2. Test with `adb shell am start` command
3. Check scheme and host match: `taskspark://task/{taskId}`

### Build Errors

1. Sync Gradle: File → Sync Project with Gradle Files
2. Clean build: Build → Clean Project → Rebuild Project
3. Invalidate caches: File → Invalidate Caches / Restart

## Next Steps

1. ✅ Complete Android setup
2. ⏳ Set Firebase service account JSON in Replit Secrets
3. ⏳ Build and test on physical device
4. ⏳ Implement notification scheduler/cron job
5. ⏳ Add notification preferences UI
6. ⏳ Test deep linking thoroughly
7. ⏳ Add notification analytics

## Security Checklist

- [ ] `google-services.json` is in `.gitignore`
- [ ] Firebase service account JSON stored in environment variable (not committed)
- [ ] Push token validation on backend
- [ ] Rate limiting on notification endpoints
- [ ] Invalid token cleanup implemented
- [ ] User can opt-out of notifications in settings
