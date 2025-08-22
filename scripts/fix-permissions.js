// Script to fix permissions for testing
// Run this in the browser console

async function fixPermissions() {
  try {
    // Get current user
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('👤 Current user:', sessionData.user);
    
    // Check if user is admin
    if (sessionData.user.role === 'admin') {
      console.log('✅ User is admin - has access to all clients');
      return;
    }
    
    // Get current permissions
    const permissionsResponse = await fetch(`/api/permissions/client?userId=${userId}`);
    const permissionsData = await permissionsResponse.json();
    
    console.log('🔍 Current permissions:', permissionsData);
    
    // Add permissions for common client codes
    const clientCodes = ['CAM', 'TEST', 'DEMO'];
    
    for (const clientCode of clientCodes) {
      // Check if permission already exists
      const existingPermission = permissionsData.permissions?.find(p => p.clientCode === clientCode);
      
      if (!existingPermission) {
        console.log(`➕ Adding permission for ${clientCode}...`);
        
        const addResponse = await fetch('/api/permissions/client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            clientCode,
            clientName: `${clientCode} Client`,
            permissionType: 'read',
            grantedBy: 'system'
          })
        });
        
        const addResult = await addResponse.json();
        if (addResult.success) {
          console.log(`✅ Added permission for ${clientCode}`);
        } else {
          console.log(`❌ Failed to add permission for ${clientCode}:`, addResult.error);
        }
      } else {
        console.log(`✅ Permission already exists for ${clientCode}`);
      }
    }
    
    // Verify permissions
    const verifyResponse = await fetch(`/api/permissions/client?userId=${userId}`);
    const verifyData = await verifyResponse.json();
    console.log('🔍 Updated permissions:', verifyData);
    
  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
  }
}

// Function to check current permissions
async function checkPermissions() {
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionResponse.ok || !sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    const permissionsResponse = await fetch(`/api/permissions/client?userId=${userId}`);
    const permissionsData = await permissionsResponse.json();
    
    console.log('🔍 Current permissions:', permissionsData);
    return permissionsData;
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  }
}

// Function to make user admin
async function makeAdmin() {
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('👤 Making user admin:', sessionData.user.email);
    
    // Update user role to admin
    const updateResponse = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'admin'
      })
    });
    
    const updateResult = await updateResponse.json();
    if (updateResult.success) {
      console.log('✅ User is now admin');
    } else {
      console.log('❌ Failed to make user admin:', updateResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error making user admin:', error);
  }
}

// Export functions for browser console
if (typeof window !== 'undefined') {
  window.fixPermissions = fixPermissions;
  window.checkPermissions = checkPermissions;
  window.makeAdmin = makeAdmin;
  
  console.log('🔧 Permission fix functions available:');
  console.log('  - fixPermissions() - Add missing permissions');
  console.log('  - checkPermissions() - Check current permissions');
  console.log('  - makeAdmin() - Make current user admin');
}

module.exports = { fixPermissions, checkPermissions, makeAdmin };
