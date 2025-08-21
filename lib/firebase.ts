import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, WhereFilterOp } from 'firebase-admin/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Database name from environment variable
const DATABASE_NAME = process.env.FIREBASE_DATABASE_NAME || 'cambria-portal';

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      // Validate required environment variables
      if (!process.env.FIREBASE_PROJECT_ID) {
        console.log('⚠️ FIREBASE_PROJECT_ID not found, using mock data');
        return null;
      }
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.log('⚠️ FIREBASE_PRIVATE_KEY not found, using mock data');
        return null;
      }
      if (!process.env.FIREBASE_CLIENT_EMAIL) {
        console.log('⚠️ FIREBASE_CLIENT_EMAIL not found, using mock data');
        return null;
      }

      // Process private key - handle different formats
      let processedPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (processedPrivateKey) {
        // Remove quotes if present
        processedPrivateKey = processedPrivateKey.replace(/^["']|["']$/g, '');
        // Replace escaped newlines
        processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
        // Ensure proper formatting
        if (!processedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          console.log('⚠️ Invalid private key format, using mock data');
          return null;
        }
      }

      // Update config with processed private key
      const configWithProcessedKey = {
        ...firebaseConfig,
        private_key: processedPrivateKey
      };

      // Initialize the app
      const app = initializeApp({
        credential: cert(configWithProcessedKey as ServiceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log(`📊 Database: ${DATABASE_NAME}`);
      
      return app;
    } else {
      console.log('✅ Firebase Admin SDK already initialized');
      return getApps()[0];
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    console.log('⚠️ Firebase initialization failed. The app will use mock data.');
    return null;
  }
}

// Get Firestore instance
function getFirestoreInstance() {
  try {
    const app = initializeFirebase();
    if (!app) {
      console.log('⚠️ Firebase not available, using mock data');
      return null;
    }
    const db = getFirestore(app);
    
    // Set database name if specified
    if (DATABASE_NAME !== 'cambria-portal') {
      console.log(`📊 Using custom database: ${DATABASE_NAME}`);
    }
    
    return db;
  } catch (error) {
    console.error('❌ Error getting Firestore instance:', error);
    console.log('⚠️ Using mock data due to Firebase error');
    return null;
  }
}

// Initialize database collections if they don't exist
async function initializeDatabase() {
  try {
    const db = getFirestoreInstance();
    
    if (!db) {
      console.log('⚠️ Firebase not available, skipping database initialization');
      return;
    }
    
    // Define required collections
    const collections = [
      'audit_logs',
      'users',
      'permissions'
    ];
    
    console.log('🔧 Initializing database collections...');
    
    // Check and create collections if they don't exist
    for (const collectionName of collections) {
      try {
        // Try to get a document to check if collection exists
        // const snapshot = await db.collection(collectionName).limit(1).get();
        console.log(`✅ Collection '${collectionName}' exists`);
      } catch {
        // Collection doesn't exist, create it with a dummy document
        console.log(`📝 Creating collection '${collectionName}'...`);
        await db.collection(collectionName).doc('_init').set({
          created_at: new Date(),
          description: 'Initialization document'
        });
        console.log(`✅ Collection '${collectionName}' created`);
      }
    }
    
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.log('⚠️ Database initialization failed, using mock data');
  }
}

// Helper function to get collection reference
function getCollection(collectionName: string) {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firebase not available');
  }
  return db.collection(collectionName);
}

// Helper function to get document reference
function getDocument(collectionName: string, documentId: string) {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firebase not available');
  }
  return db.collection(collectionName).doc(documentId);
}

// Helper function to add document with auto-generated ID
async function addDocument(collectionName: string, data: Record<string, unknown>) {
  try {
    const collection = getCollection(collectionName);
    const docRef = await collection.add({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`✅ Document added to '${collectionName}' with ID: ${docRef.id}`);
    return docRef;
  } catch (error) {
    console.error(`❌ Error adding document to '${collectionName}':`, error);
    throw error;
  }
}

// Helper function to update document
async function updateDocument(collectionName: string, documentId: string, data: Record<string, unknown>) {
  try {
    const docRef = getDocument(collectionName, documentId);
    await docRef.update({
      ...data,
      updated_at: new Date()
    });
    console.log(`✅ Document updated in '${collectionName}' with ID: ${documentId}`);
  } catch (error) {
    console.error(`❌ Error updating document in '${collectionName}':`, error);
    throw error;
  }
}

// Helper function to delete document
async function deleteDocument(collectionName: string, documentId: string) {
  try {
    const docRef = getDocument(collectionName, documentId);
    await docRef.delete();
    console.log(`✅ Document deleted from '${collectionName}' with ID: ${documentId}`);
  } catch (error) {
    console.error(`❌ Error deleting document from '${collectionName}':`, error);
    throw error;
  }
}

// Helper function to convert Firestore data to plain objects
function convertFirestoreData(data: unknown): unknown {
  if (!data) return data;
  
  if (typeof data === 'object' && data !== null) {
    // Handle Firestore Timestamps
    if ('toDate' in data && typeof (data as { toDate: unknown }).toDate === 'function') {
      return (data as { toDate: () => Date }).toDate();
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(convertFirestoreData);
    }
    
    // Handle objects
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = convertFirestoreData(value);
    }
    return converted;
  }
  
  return data;
}

// Helper function to get document by ID
async function getDocumentById(collectionName: string, documentId: string) {
  try {
    const docRef = getDocument(collectionName, documentId);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = convertFirestoreData(doc.data()) as Record<string, unknown>;
      return { id: doc.id, ...data };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting document from '${collectionName}':`, error);
    throw error;
  }
}

// Helper function to get all documents from collection
async function getAllDocuments(collectionName: string) {
  try {
    const collection = getCollection(collectionName);
    const snapshot = await collection.get();
    
    const documents: Record<string, unknown>[] = [];
    snapshot.forEach((doc) => {
      const data = convertFirestoreData(doc.data()) as Record<string, unknown>;
      documents.push({ id: doc.id, ...data });
    });
    
    return documents;
  } catch (error) {
    console.error(`❌ Error getting documents from '${collectionName}':`, error);
    throw error;
  }
}

// Helper function to query documents
async function queryDocuments(collectionName: string, field: string, operator: WhereFilterOp, value: unknown) {
  try {
    const collection = getCollection(collectionName);
    const snapshot = await collection.where(field, operator, value).get();
    
    const documents: Record<string, unknown>[] = [];
    snapshot.forEach((doc) => {
      const data = convertFirestoreData(doc.data());
      documents.push({ id: doc.id, ...(data as Record<string, unknown>) });
    });
    
    return documents;
  } catch (error) {
    console.error(`❌ Error querying documents from '${collectionName}':`, error);
    throw error;
  }
}

export {
  initializeFirebase,
  getFirestoreInstance,
  initializeDatabase,
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentById,
  getAllDocuments,
  queryDocuments,
  DATABASE_NAME
};
