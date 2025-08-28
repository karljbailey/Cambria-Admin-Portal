#!/usr/bin/env node

/**
 * Script to create a compact Firebase configuration
 * This helps reduce environment variable usage and avoid the 4KB AWS Lambda limit
 * 
 * Usage:
 * 1. Set your Firebase environment variables
 * 2. Run: node scripts/create-compact-firebase-config.js
 * 3. Copy the output to your FIREBASE_COMPACT_CONFIG environment variable
 */

const { encodeFirebaseConfig } = require('../lib/firebase-config.ts');

function createCompactConfig() {
  // Check if required environment variables are set
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY', 
    'FIREBASE_CLIENT_EMAIL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }

  // Process private key
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Remove quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Create compact configuration
  const config = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };

  // Encode the configuration
  const encodedConfig = encodeFirebaseConfig(config);

  console.log('✅ Compact Firebase configuration created successfully!');
  console.log('\n📋 Copy this to your FIREBASE_COMPACT_CONFIG environment variable:');
  console.log('\n' + '='.repeat(80));
  console.log(encodedConfig);
  console.log('='.repeat(80));
  
  console.log('\n📊 Configuration details:');
  console.log(`   Project ID: ${config.projectId}`);
  console.log(`   Client Email: ${config.clientEmail}`);
  console.log(`   Private Key Length: ${config.privateKey.length} characters`);
  console.log(`   Encoded Length: ${encodedConfig.length} characters`);
  
  // Calculate size savings
  const originalSize = JSON.stringify({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL
  }).length;
  
  const compactSize = encodedConfig.length;
  const savings = originalSize - compactSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
  
  console.log(`\n💾 Size comparison:`);
  console.log(`   Original: ${originalSize} characters`);
  console.log(`   Compact: ${compactSize} characters`);
  console.log(`   Savings: ${savings} characters (${savingsPercent}%)`);
  
  if (savings > 0) {
    console.log('\n🎉 You can now remove these environment variables:');
    console.log('   - FIREBASE_PROJECT_ID');
    console.log('   - FIREBASE_PRIVATE_KEY');
    console.log('   - FIREBASE_CLIENT_EMAIL');
    console.log('\nAnd replace them with just:');
    console.log('   - FIREBASE_COMPACT_CONFIG');
  }
}

// Run the script
if (require.main === module) {
  createCompactConfig();
}

module.exports = { createCompactConfig };
