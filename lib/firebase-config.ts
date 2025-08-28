// Firebase configuration with reduced environment variable usage
// This helps avoid the 4KB AWS Lambda environment variable limit

export interface CompactFirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

// Function to decode a compact Firebase configuration
export function decodeFirebaseConfig(encodedConfig: string): CompactFirebaseConfig | null {
  try {
    // Simple base64 decoding (you can use a more secure method if needed)
    const decoded = Buffer.from(encodedConfig, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode Firebase config:', error);
    return null;
  }
}

// Function to create a compact Firebase configuration
export function encodeFirebaseConfig(config: CompactFirebaseConfig): string {
  const jsonString = JSON.stringify(config);
  return Buffer.from(jsonString).toString('base64');
}

// Get Firebase configuration from environment variables
export function getFirebaseConfig(): CompactFirebaseConfig | null {
  // Try compact config first (most efficient)
  if (process.env.FIREBASE_COMPACT_CONFIG) {
    const config = decodeFirebaseConfig(process.env.FIREBASE_COMPACT_CONFIG);
    if (config) {
      return config;
    }
  }

  // Fallback to individual environment variables
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_CLIENT_EMAIL) {
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    // Remove quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
  }

  return null;
}
