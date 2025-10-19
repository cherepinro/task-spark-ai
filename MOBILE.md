# TaskSpark AI - Mobile Android App

## Overview
TaskSpark AI is now available as a native Android mobile app powered by Capacitor! The same codebase serves both the web application and the Android mobile app.

## Tech Stack
- **Framework**: Capacitor 7.4+
- **Platform**: Android (iOS support can be added later)
- **Backend**: Express.js REST API
- **Database**: PostgreSQL (Neon)

## Development Setup

### Prerequisites
1. **Node.js** (v18+)
2. **Android Studio** with:
   - Android SDK
   - Android Platform Tools
   - Java Development Kit (JDK 17+)

### Environment Variables
Set these in your shell profile:
```bash
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export JAVA_HOME=/path/to/jdk-17
```

## Building the Android App

### 1. Build the Web App
```bash
npm run build
```
This creates optimized production files in `dist/public/`.

### 2. Sync to Android
```bash
npx cap sync android
```
This copies the web assets to the Android project and updates native plugins.

### 3. Open in Android Studio
```bash
npx cap open android
```

### 4. Build APK
In Android Studio:
1. Go to **Build → Build Bundle(s)/APK(s) → Build APK(s)**
2. Wait for Gradle to complete
3. Click **Locate** to find your APK in `android/app/build/outputs/apk/`

## Development Workflow

### Quick Commands
```bash
# Full rebuild and sync
npm run build && npx cap sync android

# Just sync without rebuilding (after code changes)
npx cap sync android

# Open in Android Studio for debugging
npx cap open android

# Run on connected device/emulator
npx cap run android
```

### Live Reload (Development)
For development with live reload:
1. Start the dev server: `npm run dev`
2. Update `capacitor.config.ts`:
```typescript
server: {
  url: 'http://10.0.2.2:5000', // Android emulator localhost
  cleartext: true
}
```
3. Rebuild and sync: `npm run build && npx cap sync android`
4. Run in emulator

**Important:** Remove the `server.url` setting before production builds!

## Production Build Checklist

Before deploying to production:
- [ ] Remove `server.url` from `capacitor.config.ts`
- [ ] Run `npm run build` with production environment
- [ ] Update version in `android/app/build.gradle`
- [ ] Test on physical devices
- [ ] Generate signed APK for release

## Native Features

The app includes these native Capacitor plugins:
- **@capacitor/app** - App state, URL handling
- **@capacitor/keyboard** - Keyboard behavior control
- **@capacitor/status-bar** - Status bar customization

### Adding More Native Features
```bash
# Example: Add Camera support
npm install @capacitor/camera
npx cap sync android
```

Then import in your React code:
```typescript
import { Camera } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri
  });
  return image.webPath;
};
```

## App Configuration

### App ID & Name
Configured in `capacitor.config.ts`:
```typescript
appId: 'ai.taskspark.app'
appName: 'TaskSpark AI'
```

### Theme & Splash Screen
- **Status Bar**: Dark style with black background
- **Splash Screen**: Disabled (instant launch)
- **Theme Color**: #000000 (dark mode)

### Permissions
Defined in `android/app/src/main/AndroidManifest.xml`. Currently includes:
- Internet access (for API calls)
- Network state

## Troubleshooting

### Build Errors
**"SDK not found"**: Set `ANDROID_SDK_ROOT` environment variable
**"Java version"**: Ensure JDK 17+ is installed and `JAVA_HOME` is set
**"Gradle sync failed"**: In Android Studio, go to File → Invalidate Caches → Restart

### App Crashes
1. Check Android logcat in Android Studio
2. Verify backend API is accessible from device
3. Check `capacitor.config.ts` settings

### Assets Not Updating
```bash
# Force clean and rebuild
rm -rf android/app/src/main/assets/public
npm run build
npx cap sync android
```

## Backend API Connection

### Development
The app connects to your backend at the URL configured in the React app. For local development:
- **Web**: `http://localhost:5000`
- **Android Emulator**: `http://10.0.2.2:5000` (use server.url in capacitor.config.ts)

### Production
Update your API base URL to point to your deployed backend (e.g., Replit deployment URL).

## Deployment

### Google Play Store
1. Generate a signed release APK/AAB in Android Studio
2. Create a Google Play Developer account
3. Prepare store listing (screenshots, description)
4. Upload and publish

### Testing Distribution
For beta testing without Play Store:
- Use Firebase App Distribution
- Or distribute APK directly (requires "Install from Unknown Sources")

## File Structure
```
android/                     # Native Android project
├── app/
│   ├── src/main/
│   │   ├── assets/public/  # Web app files (synced from dist/public)
│   │   ├── AndroidManifest.xml
│   │   └── res/            # App icons, splash screens
│   └── build.gradle        # App-level build config
├── build.gradle            # Project-level build config
└── capacitor.settings.gradle

capacitor.config.ts         # Capacitor configuration
client/index.html           # Mobile-optimized meta tags
dist/public/                # Built web assets
```

## Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Download](https://developer.android.com/studio)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Publishing to Play Store](https://developer.android.com/studio/publish)

## Next Steps
- [ ] Add app icon and splash screen
- [ ] Configure app signing for release
- [ ] Add push notifications
- [ ] Implement offline support
- [ ] Add iOS platform support
