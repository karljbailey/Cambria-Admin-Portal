import { initializeFirebase, initializeDatabase } from './firebase';
import { initializeCollectionsWithSampleData } from './collections';

// Global initialization flag
let isInitialized = false;

// Initialize Firebase and database
export async function initializeApp() {
  if (isInitialized) {
    console.log('🚀 Application already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing Cambria Portal application...');
    
    // Initialize Firebase
    const firebaseApp = initializeFirebase();
    
    if (firebaseApp) {
      // Initialize database collections
      await initializeDatabase();
      
      // Initialize collections with sample data
      await initializeCollectionsWithSampleData();
      
      console.log('✅ Application initialization completed successfully with Firebase');
    } else {
      console.log('⚠️ Application initialization completed with mock data (Firebase not available)');
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    console.log('⚠️ Application will use mock data');
    isInitialized = true; // Still mark as initialized so the app can run
  }
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  const hasRequiredVars = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  );
  
  if (!hasRequiredVars) {
    return false;
  }
  
  // Try to initialize Firebase to check if it works
  try {
    const app = initializeFirebase();
    return app !== null;
  } catch (error) {
    console.log('⚠️ Firebase configuration check failed:', error);
    return false;
  }
}

// Get initialization status
export function getInitializationStatus(): boolean {
  return isInitialized;
}
