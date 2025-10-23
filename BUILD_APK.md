# Building TaskSpark AI Android APK

Unfortunately, building Android APKs directly on Replit is not practical due to the large Android SDK requirements and build tools needed. Here are the best options to generate your APK:

## Option 1: Build Locally (Recommended)

### Prerequisites
- **Android Studio** (download from https://developer.android.com/studio)
- **Node.js 20+** installed (Capacitor CLI requirement)
- **JDK 21** (included with Android Studio, or download from https://adoptium.net/)
- **Git** installed

### Steps

1. **Clone your repository:**
```bash
git clone https://github.com/CherepinRO/task-spark-ai.git
cd task-spark-ai
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the web application:**
```bash
npm run build
```

4. **Sync to Android:**
```bash
npx cap sync android
```

5. **Open in Android Studio:**
```bash
npx cap open android
```

6. **Build APK in Android Studio:**
   - Wait for Gradle sync to complete
   - Go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build to complete (may take 5-10 minutes first time)
   - Click "locate" in the notification to find your APK

**APK Location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on Phone
- Transfer the `app-debug.apk` file to your Android phone
- Open the file on your phone
- Allow installation from unknown sources if prompted
- Install the app

---

## Option 2: Build via Command Line (Faster)

If you have Android SDK already configured:

```bash
# 1. Build web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug
cd ..
```

**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Option 3: GitHub Actions (Automated Builds)

Create `.github/workflows/build-android.yml`:

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup JDK
      uses: actions/setup-java@v3
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build web app
      run: npm run build
      
    - name: Sync Capacitor
      run: npx cap sync android
      
    - name: Build APK
      run: |
        cd android
        chmod +x gradlew
        ./gradlew assembleDebug
        
    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: app-debug
        path: android/app/build/outputs/apk/debug/app-debug.apk
```

After pushing this file, go to **Actions** tab on GitHub and download the built APK.

---

## Important Configuration

### App Signing (For Release Build)

For production releases, you need to sign the APK:

1. **Generate keystore:**
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **Add to `android/app/build.gradle`:**
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('my-release-key.keystore')
            storePassword 'your-keystore-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

3. **Build release APK:**
```bash
cd android
./gradlew assembleRelease
```

**⚠️ IMPORTANT:** Keep your keystore file safe! You cannot update your app on Google Play without it.

---

## Troubleshooting

### "SDK location not found"
Create `android/local.properties`:
```
sdk.dir=/path/to/Android/sdk
```

### "JAVA_HOME not set"
```bash
export JAVA_HOME=/path/to/jdk
```

### Gradle build fails
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### App crashes on launch
Check that Firebase configuration is set up correctly with your `google-services.json` file in `android/app/`.

---

## Current App Configuration

- **App ID:** ai.taskspark.app
- **App Name:** TaskSpark AI
- **Package:** Configured for Firebase Push Notifications
- **Deep Linking:** Supports `taskspark://task/{taskId}` URLs

---

## Next Steps After Building

1. **Test the APK** on your Android device
2. **Check Firebase connection** - Push notifications should work
3. **Test Google OAuth login** - Make sure it's configured in Firebase Console
4. **Prepare for Play Store** - Build a signed release APK when ready

For Play Store submission, you'll need:
- Google Play Developer account ($25 one-time fee)
- App screenshots and description
- Privacy policy URL
- Signed release APK or AAB (Android App Bundle)
