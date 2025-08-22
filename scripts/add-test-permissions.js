// Script to add test permissions for debugging
// Run this in the browser console or as a Node.js script

async function addTestPermissions() {
  try {
    // First, get the current user
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('👤 Current user:', sessionData.user);
    
    // Add test permissions for common client codes
    const testPermissions = [
      { clientCode: 'CAM', clientName: 'Cambria', permissionType: 'read' },
      { clientCode: 'TEST', clientName: 'Test Client', permissionType: 'read' },
      { clientCode: 'DEMO', clientName: 'Demo Client', permissionType: 'read' }
    ];
    
    for (const permission of testPermissions) {
      const response = await fetch('/api/debug/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...permission
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Added permission for ${permission.clientCode}`);
      } else {
        console.log(`❌ Failed to add permission for ${permission.clientCode}:`, result.error);
      }
    }
    
    // Check current permissions
    const debugResponse = await fetch(`/api/debug/permissions?userId=${userId}`);
    const debugData = await debugResponse.json();
    console.log('🔍 Current permissions:', debugData);
    
  } catch (error) {
    console.error('❌ Error adding test permissions:', error);
  }
}

// Function to check current permissions
async function checkCurrentPermissions() {
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    const debugResponse = await fetch(`/api/debug/permissions?userId=${userId}`);
    const debugData = await debugResponse.json();
    
    console.log('🔍 Current user permissions:', debugData);
    return debugData;
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  }
}

// Export functions for use in browser console
if (typeof window !== 'undefined') {
  window.addTestPermissions = addTestPermissions;
  window.checkCurrentPermissions = checkCurrentPermissions;
  console.log('🔧 Debug functions available:');
  console.log('  - addTestPermissions() - Add test permissions');
  console.log('  - checkCurrentPermissions() - Check current permissions');
}

module.exports = { addTestPermissions, checkCurrentPermissions };
