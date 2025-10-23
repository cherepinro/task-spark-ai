#!/bin/bash
# TaskSpark AI - Android APK Build Script
# This script automates the APK build process

set -e  # Exit on error

echo "🚀 Building TaskSpark AI Android APK"
echo "======================================"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check for Java
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install JDK 17+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ Java version: $(java -version 2>&1 | head -n 1)"
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Build web app
echo "🏗️  Building web application..."
npm run build

# Step 3: Sync to Android
echo "📱 Syncing to Android platform..."
npx cap sync android

# Step 4: Build APK
echo "🔨 Building debug APK (this may take several minutes)..."
cd android
chmod +x gradlew
./gradlew assembleDebug
cd ..

# Check if APK was created
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo "======================================"
    echo "APK Location: $APK_PATH"
    echo "APK Size: $APK_SIZE"
    echo ""
    echo "📲 To install on your Android device:"
    echo "   1. Transfer the APK file to your phone"
    echo "   2. Open the file on your phone"
    echo "   3. Allow installation from unknown sources if prompted"
    echo "   4. Install and enjoy TaskSpark AI!"
else
    echo "❌ Build failed - APK not found at $APK_PATH"
    exit 1
fi
