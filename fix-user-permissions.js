// Script to fix user permissions
// Run this in the browser console to add permissions for testing

console.log('🔧 User Permission Fix Script');

async function fixUserPermissions() {
  console.log('\n📋 Step 1: Get Current User');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('Current user ID:', userId);
    
  } catch (error) {
    console.error('❌ Error getting user session:', error);
    return;
  }
  
  console.log('\n📋 Step 2: Get All Available Clients');
  
  try {
    // Get all clients (admin function)
    const allClientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}&forPermissionManagement=true`);
    const allClientsData = await allClientsResponse.json();
    
    if (!allClientsResponse.ok) {
      console.log('❌ Cannot get all clients - user might not be admin');
      console.log('Error:', allClientsData.error);
      return;
    }
    
    const allClients = allClientsData.clients || [];
    console.log('Available clients:', allClients.length);
    
    if (allClients.length === 0) {
      console.log('⚠️ No clients found in the system');
      return;
    }
    
    // Show available clients
    allClients.forEach((client, index) => {
      console.log(`  ${index + 1}. ${client.clientCode} - ${client.clientName}`);
    });
    
  } catch (error) {
    console.error('❌ Error getting all clients:', error);
    return;
  }
  
  console.log('\n📋 Step 3: Add Permissions for Testing');
  
  // Function to add permission for a client
  async function addPermission(clientCode, clientName, permissionType = 'read') {
    try {
      const response = await fetch('/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sessionData.user.id,
          clientCode: clientCode,
          clientName: clientName,
          permissionType: permissionType,
          grantedBy: 'debug-script'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Added ${permissionType} permission for ${clientCode}`);
        return true;
      } else {
        console.log(`❌ Failed to add permission for ${clientCode}:`, data.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error adding permission for ${clientCode}:`, error);
      return false;
    }
  }
  
  // Add permissions for first few clients
  const clientsToAdd = allClients.slice(0, 3); // Add permissions for first 3 clients
  let successCount = 0;
  
  for (const client of clientsToAdd) {
    const success = await addPermission(client.clientCode, client.clientName, 'read');
    if (success) successCount++;
  }
  
  console.log(`\n📊 Results: Added ${successCount}/${clientsToAdd.length} permissions`);
  
  if (successCount > 0) {
    console.log('\n🔄 Step 4: Refresh Page');
    console.log('Permissions added! Please refresh the page to see the changes.');
    console.log('Or run: location.reload()');
  }
}

// Function to make user admin
async function makeUserAdmin() {
  console.log('\n👑 Making User Admin');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('User ID:', userId);
    
    // Update user role to admin
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'admin'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ User role updated to admin');
      console.log('🔄 Please refresh the page to see the changes.');
    } else {
      console.log('❌ Failed to update user role:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
  }
}

// Function to check current permissions
async function checkCurrentPermissions() {
  console.log('\n📋 Checking Current Permissions');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    
    // Get user details
    const userResponse = await fetch(`/api/users/${userId}`);
    const userData = await userResponse.json();
    
    if (userData.success) {
      const user = userData.user;
      console.log('User role:', user.role);
      console.log('Client permissions:', user.clientPermissions);
      
      if (user.clientPermissions && user.clientPermissions.length > 0) {
        console.log('Current permissions:');
        user.clientPermissions.forEach((perm, index) => {
          console.log(`  ${index + 1}. ${perm.clientCode} - ${perm.permissionType}`);
        });
      } else {
        console.log('⚠️ No client permissions found');
      }
    } else {
      console.log('❌ Failed to get user details:', userData.error);
    }
    
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  }
}

// Export functions
window.fixUserPermissions = fixUserPermissions;
window.makeUserAdmin = makeUserAdmin;
window.checkCurrentPermissions = checkCurrentPermissions;

console.log('🔧 Fix script loaded. Available functions:');
console.log('- fixUserPermissions() - Add permissions for testing');
console.log('- makeUserAdmin() - Make current user admin');
console.log('- checkCurrentPermissions() - Check current permissions');
