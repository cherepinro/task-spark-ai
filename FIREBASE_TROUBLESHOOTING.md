# Firebase Authentication Troubleshooting

## Current Issue: "Invalid Firebase Token"

### Root Cause
The backend **cannot verify Firebase ID tokens** because `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is missing.

### What's Working ✅
- Frontend Firebase initialization (all `VITE_FIREBASE_*` variables are set)
- Google sign-in popup opens successfully
- Firebase ID token is obtained from Google

### What's NOT Working ❌
- Backend cannot verify the Firebase ID token
- This prevents creating a session and logging in the user

---

## Solution: Add Firebase Service Account JSON

### Step 1: Get Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **task-spark-ia**
3. Click the **gear icon** (⚙️) → **Project settings**
4. Navigate to **Service accounts** tab
5. Click **"Generate new private key"** button
6. Click **"Generate key"** in the confirmation dialog
7. A JSON file will download (e.g., `task-spark-ia-firebase-adminsdk-xxxxx.json`)

### Step 2: Add to Replit Secrets

1. Open the downloaded JSON file in a text editor
2. Copy the **entire contents** (it should look like this):

```json
{
  "type": "service_account",
  "project_id": "task-spark-ia",
  "private_key_id": "1234567890abcdef...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@task-spark-ia.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40task-spark-ia.iam.gserviceaccount.com"
}
```

3. In Replit, go to **Tools** → **Secrets**
4. Click **"New Secret"**
5. Set key: `FIREBASE_SERVICE_ACCOUNT_JSON`
6. Paste the **entire JSON content** as the value
7. Click **"Add Secret"**

⚠️ **Important**: 
- Copy the entire JSON object as a **single line** (Replit Secrets will handle this)
- Do NOT modify the content
- Make sure there are no extra spaces before or after

### Step 3: Verify

After adding the secret, the application will automatically restart. Check the logs:

**Before (Error):**
```
[WARN] Firebase service account not configured. Push notifications will not work.
```

**After (Success):**
```
[INFO] Firebase Admin SDK initialized successfully
```

---

## Testing Google Sign-In

Once `FIREBASE_SERVICE_ACCOUNT_JSON` is configured:

1. Open your application
2. Go to the login page
3. Click **"Sign in with Google"**
4. Select your Google account
5. Check the **browser console** (F12) for detailed logs:
   - `🚀 Starting Google sign-in...`
   - `✅ Google popup sign-in successful`
   - `🎫 Firebase ID token obtained`
   - `📨 Sending token to backend...`
   - `✅ Backend authentication successful`

6. Check the **backend logs** for:
   - `📨 Firebase auth request received`
   - `🎫 ID token received from client`
   - `🔍 Attempting to verify Firebase ID token...`
   - `✅ Firebase ID token verified successfully`
   - `✅ Token verified, processing user...`

---

## Common Errors & Solutions

### Error: "auth/unauthorized-domain"
**Cause**: Your Replit domain is not authorized in Firebase Console

**Solution**:
1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **"Add domain"**
3. Enter your Replit domain (e.g., `your-repl-name.repl.co`)
4. Click **"Add"**

### Error: "Firebase not initialized"
**Cause**: `FIREBASE_SERVICE_ACCOUNT_JSON` is not set or is invalid

**Solution**:
1. Check that the secret exists in Replit Secrets
2. Verify the JSON is valid (copy-paste directly from Firebase Console)
3. Restart the application

### Error: "auth/invalid-api-key"
**Cause**: `VITE_FIREBASE_API_KEY` has extra spaces or is incorrect

**Solution**:
1. Delete and recreate the `VITE_FIREBASE_API_KEY` secret
2. Copy the exact value: `AIzaSyDGItwWiv6z3wy2tIRv940Vu8JP5J-BCZ0`
3. Ensure no leading/trailing spaces

### Error: "Token verification failed"
**Cause**: Token might be expired or Firebase project mismatch

**Solution**:
1. Check backend logs for detailed error code
2. Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is from the correct Firebase project
3. Try signing in again (tokens expire after 1 hour)

---

## Environment Variables Checklist

### Frontend (all set ✅):
- ✅ `VITE_FIREBASE_API_KEY`
- ✅ `VITE_FIREBASE_AUTH_DOMAIN`
- ✅ `VITE_FIREBASE_PROJECT_ID`
- ✅ `VITE_FIREBASE_STORAGE_BUCKET`
- ✅ `VITE_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `VITE_FIREBASE_APP_ID`

### Backend (needs to be added):
- ❌ `FIREBASE_SERVICE_ACCOUNT_JSON` - **ADD THIS NOW**

---

## Quick Fix Summary

**To fix "Invalid Firebase token" error:**

1. Download service account JSON from Firebase Console → Project Settings → Service Accounts
2. Add to Replit Secrets as `FIREBASE_SERVICE_ACCOUNT_JSON`
3. Wait for automatic restart
4. Test Google sign-in again

That's it! 🎉
