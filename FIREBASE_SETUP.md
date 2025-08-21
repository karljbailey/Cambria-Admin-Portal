# Firebase Setup Guide

This guide will help you set up Firebase for the Cambria Portal application.

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firebase Admin SDK service account key

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name (e.g., "cambria-portal")
4. Follow the setup wizard

### 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database

### 3. Generate Service Account Key

1. In Firebase Console, go to Project Settings (gear icon)
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file

### 4. Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour firebase private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_client_email%40project.iam.gserviceaccount.com
FIREBASE_DATABASE_NAME=cambria-portal
```

### 5. Extract Values from Service Account JSON

From your downloaded service account JSON file, extract these values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"
}
```

### 6. Database Collections

The application will automatically create these collections:

- `clients` - Client information
- `audit_logs` - Audit trail data
- `users` - User management
- `permissions` - User permissions
- `monthly_reports` - Monthly report data

### 7. Security Rules (Optional)

For production, set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Testing the Setup

1. Start the development server: `npm run dev`
2. Check the console for Firebase initialization messages
3. The application will automatically create collections if they don't exist

## Troubleshooting

### Common Issues

1. **"FIREBASE_PROJECT_ID environment variable is required"**
   - Make sure you've set the `FIREBASE_PROJECT_ID` in your `.env.local`

2. **"FIREBASE_PRIVATE_KEY environment variable is required"**
   - Ensure the private key is properly formatted with `\n` for line breaks

3. **"Permission denied"**
   - Check that your service account has the necessary permissions
   - Verify your Firestore security rules

4. **"Database not found"**
   - Make sure you've created a Firestore database in your Firebase project

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Admin SDK Guide](https://firebase.google.com/docs/admin/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

