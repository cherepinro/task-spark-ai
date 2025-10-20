# Firebase Authentication Setup Guide

TaskSpark AI uses **Firebase Authentication** for Google OAuth sign-in. This guide will help you set up Firebase for authentication and push notifications.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create Firebase Project (if you don't have one)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select your existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "TaskSpark AI")
   - Enable Google Analytics (optional)
   - Create project

## Step 2: Enable Google Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Toggle **Enable**
4. Set project support email (your email)
5. Click **Save**

✅ **That's it!** Firebase automatically configures Google OAuth for your project. No separate OAuth client ID/secret needed.

## Step 3: Get Firebase Config for Frontend

### Web App Config

1. Go to **Project Settings** (gear icon) → **General** tab
2. Scroll down to "Your apps" section
3. If you haven't added a web app yet:
   - Click the **</>** (Web) icon
   - Register app with nickname (e.g., "TaskSpark Web")
   - Don't enable Firebase Hosting (we're using Replit)
   - Click "Register app"

4. Copy the **Firebase configuration** object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc..."
};
```

## Step 4: Add Config to Replit Secrets

Add the following environment variables to your Replit Secrets:

### Frontend Firebase Config (for Google OAuth)

Go to Replit **Secrets** (Tools → Secrets) and add:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc...
```

### Backend Firebase Admin SDK (for Push Notifications)

You'll also need the Firebase Admin SDK service account JSON:

1. Go to **Project Settings** → **Service accounts** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the confirmation dialog
4. A JSON file will download

5. Copy the **entire contents** of the downloaded JSON file
6. In Replit Secrets, add:

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

⚠️ **Important**: Paste the entire JSON as a single line (no line breaks except within the private key itself).

## Step 5: Configure Authorized Domains

Firebase automatically allows:
- `localhost` (for local development)
- `*.firebaseapp.com` (your Firebase hosting domain)
- `*.web.app` (your Firebase web app domain)

To add your Replit domain:

1. Go to **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Enter your Replit domain (e.g., `your-repl-name.repl.co`)
5. Click **Add**

## Step 6: Test Authentication

1. Restart your Replit application
2. Navigate to the login page
3. Click **"Sign in with Google"**
4. Select your Google account
5. Grant permissions
6. You should be redirected to the dashboard

## Troubleshooting

### Error: "Firebase: Error (auth/unauthorized-domain)"

**Solution**: Add your domain to Authorized domains (Step 5)

### Error: "Firebase not initialized"

**Solution**: Check that all Firebase config variables are set in Replit Secrets

### Error: "Invalid Firebase token"

**Solution**: 
- Make sure `FIREBASE_SERVICE_ACCOUNT_JSON` is correctly formatted
- Verify the service account has the correct permissions

### Google Sign-In Button Not Working

**Solution**:
- Check browser console for errors
- Verify all `VITE_FIREBASE_*` variables are set
- Make sure you enabled Google provider in Firebase Console

## Environment Variables Summary

### Required for Google OAuth:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN  
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_JSON
```

### Already configured:
```
DATABASE_URL
SESSION_SECRET
```

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Google Sign-In Guide](https://firebase.google.com/docs/auth/web/google-signin)

## Next Steps

Once Firebase authentication is set up:
1. ✅ Users can sign in with Google
2. ✅ User profiles are automatically created
3. ✅ Google profile pictures are saved
4. ✅ Existing email/password authentication still works
5. ✅ Push notifications work (if enabled)

Need help? Check the logs or contact support.
