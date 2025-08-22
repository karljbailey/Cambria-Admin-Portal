// Debug script to check client code mismatch
// Run this in the browser console to see the exact issue

console.log('🔍 Client Code Mismatch Debug Script');

async function debugClientMismatch() {
  console.log('\n📋 Step 1: Check Your Permissions');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('User ID:', userId);
    
    // Get user details
    const userResponse = await fetch(`/api/users/${userId}`);
    const userData = await userResponse.json();
    
    if (userData.success) {
      const user = userData.user;
      console.log('User role:', user.role);
      console.log('Client permissions:', user.clientPermissions);
      
      if (user.clientPermissions && user.clientPermissions.length > 0) {
        console.log('Your permission client codes:');
        user.clientPermissions.forEach((perm, index) => {
          console.log(`  ${index + 1}. "${perm.clientCode}" (${perm.clientName})`);
        });
      } else {
        console.log('⚠️ No client permissions found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting user details:', error);
    return;
  }
  
  console.log('\n📋 Step 2: Check All Available Clients (Admin View)');
  
  try {
    // Get all clients (admin function)
    const allClientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}&forPermissionManagement=true`);
    const allClientsData = await allClientsResponse.json();
    
    console.log('All clients API response status:', allClientsResponse.status);
    
    if (allClientsResponse.ok) {
      const allClients = allClientsData.clients || [];
      console.log('Total clients in system:', allClients.length);
      
      if (allClients.length > 0) {
        console.log('All client codes in Google Sheets:');
        allClients.forEach((client, index) => {
          console.log(`  ${index + 1}. "${client.clientCode}" (${client.clientName})`);
        });
      } else {
        console.log('⚠️ No clients found in Google Sheets');
      }
    } else {
      console.log('❌ Cannot get all clients - user might not be admin');
      console.log('Error:', allClientsData.error);
    }
    
  } catch (error) {
    console.error('❌ Error getting all clients:', error);
  }
  
  console.log('\n📋 Step 3: Check Filtered Clients (Your View)');
  
  try {
    // Get filtered clients (your view)
    const filteredClientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}`);
    const filteredClientsData = await filteredClientsResponse.json();
    
    console.log('Filtered clients API response status:', filteredClientsResponse.status);
    
    if (filteredClientsResponse.ok) {
      const filteredClients = filteredClientsData.clients || [];
      console.log('Clients you can see:', filteredClients.length);
      
      if (filteredClients.length > 0) {
        console.log('Your accessible clients:');
        filteredClients.forEach((client, index) => {
          console.log(`  ${index + 1}. "${client.clientCode}" (${client.clientName})`);
        });
      } else {
        console.log('⚠️ No clients returned - this is the problem!');
      }
    } else {
      console.log('❌ Filtered clients API call failed');
      console.log('Error:', filteredClientsData.error);
    }
    
  } catch (error) {
    console.error('❌ Error getting filtered clients:', error);
  }
  
  console.log('\n🔍 Analysis:');
  console.log('1. Check if your permission client codes match the Google Sheets client codes');
  console.log('2. Look for case sensitivity issues (CAM vs cam)');
  console.log('3. Look for extra spaces or special characters');
  console.log('4. Check if the client codes are exactly the same');
  
  console.log('\n💡 Common Issues:');
  console.log('- Permission has "CAM" but Google Sheets has "cam" (case mismatch)');
  console.log('- Permission has "CAM " but Google Sheets has "CAM" (extra space)');
  console.log('- Permission has "CAM" but Google Sheets has "CAMBRIA" (different codes)');
  console.log('- Google Sheets is empty or has no clients');
}

// Function to fix permission client codes
async function fixPermissionClientCodes() {
  console.log('\n🔧 Fix Permission Client Codes');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    
    // Get all clients first
    const allClientsResponse = await fetch(`/api/clients?userId=${userId}&forPermissionManagement=true`);
    const allClientsData = await allClientsResponse.json();
    
    if (!allClientsResponse.ok) {
      console.log('❌ Cannot get all clients');
      return;
    }
    
    const allClients = allClientsData.clients || [];
    console.log('Available clients:', allClients.length);
    
    // Get user details
    const userResponse = await fetch(`/api/users/${userId}`);
    const userData = await userResponse.json();
    
    if (!userData.success) {
      console.log('❌ Cannot get user details');
      return;
    }
    
    const user = userData.user;
    const currentPermissions = user.clientPermissions || [];
    
    console.log('Current permissions:', currentPermissions.length);
    
    // Find the first client and add permission for it
    if (allClients.length > 0) {
      const firstClient = allClients[0];
      console.log('Adding permission for:', firstClient.clientCode, firstClient.clientName);
      
      // Add permission using the exact client code from Google Sheets
      const addPermissionResponse = await fetch('/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          clientCode: firstClient.clientCode, // Use exact code from Google Sheets
          clientName: firstClient.clientName,
          permissionType: 'read',
          grantedBy: 'debug-script'
        })
      });
      
      const addPermissionData = await addPermissionResponse.json();
      
      if (addPermissionData.success) {
        console.log('✅ Permission added successfully');
        console.log('🔄 Please refresh the page to see the changes.');
      } else {
        console.log('❌ Failed to add permission:', addPermissionData.error);
      }
    } else {
      console.log('⚠️ No clients available to add permissions for');
    }
    
  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
  }
}

// Export functions
window.debugClientMismatch = debugClientMismatch;
window.fixPermissionClientCodes = fixPermissionClientCodes;

// Auto-run debug
debugClientMismatch();

console.log('🔍 Client mismatch debug script loaded.');
console.log('Available functions:');
console.log('- debugClientMismatch() - Check client code mismatch');
console.log('- fixPermissionClientCodes() - Fix permission client codes');
