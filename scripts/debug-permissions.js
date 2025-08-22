// Debug script to identify permission issues
// Run this in the browser console

async function debugPermissions() {
  try {
    console.log('🔍 Starting permission debug...');
    
    // Get current user
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log('👤 Current user:', sessionData.user);
    
    // Get user details from database
    console.log('🔍 Getting user details from database...');
    const userResponse = await fetch(`/api/users/${userId}`);
    const userData = await userResponse.json();
    
    if (userData.success) {
      console.log('✅ User details:', userData.user);
    } else {
      console.log('❌ Failed to get user details:', userData.error);
    }
    
    // Get permissions
    console.log('🔍 Getting permissions...');
    const permissionsResponse = await fetch(`/api/permissions/client?userId=${userId}`);
    const permissionsData = await permissionsResponse.json();
    
    if (permissionsData.success) {
      console.log('✅ Permissions:', permissionsData.permissions);
    } else {
      console.log('❌ Failed to get permissions:', permissionsData.error);
    }
    
    // Get current URL client code
    const currentPath = window.location.pathname;
    const clientCodeMatch = currentPath.match(/\/client\/([^\/]+)/);
    const clientCode = clientCodeMatch ? clientCodeMatch[1] : null;
    
    if (clientCode) {
      console.log('🔍 Current client code from URL:', clientCode);
      
      // Test different case variations
      const variations = [
        clientCode,
        clientCode.toUpperCase(),
        clientCode.toLowerCase(),
        clientCode.charAt(0).toUpperCase() + clientCode.slice(1).toLowerCase()
      ];
      
      console.log('🔍 Testing client code variations:', variations);
      
      // Check which variations match permissions
      if (permissionsData.success && permissionsData.permissions) {
        variations.forEach(variation => {
          const hasPermission = permissionsData.permissions.some(p => 
            p.clientCode === variation || 
            p.clientCode.toUpperCase() === variation.toUpperCase()
          );
          console.log(`  ${variation}: ${hasPermission ? '✅' : '❌'}`);
        });
      }
    }
    
    // Test permission API directly
    if (clientCode) {
      console.log('🔍 Testing permission API directly...');
      const testResponse = await fetch(`/api/permissions/client?userId=${userId}&clientCode=${clientCode}`);
      const testData = await testResponse.json();
      console.log('✅ Direct permission test:', testData);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Function to add test permissions
async function addTestPermission(clientCode) {
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.error('❌ User not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    console.log(`➕ Adding test permission for ${clientCode}...`);
    
    const response = await fetch('/api/permissions/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        clientCode,
        clientName: `${clientCode} Client`,
        permissionType: 'read',
        grantedBy: 'debug-script'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(`✅ Added permission for ${clientCode}`);
    } else {
      console.log(`❌ Failed to add permission for ${clientCode}:`, result.error);
    }
    
  } catch (error) {
    console.error('❌ Error adding test permission:', error);
  }
}

// Export functions for browser console
if (typeof window !== 'undefined') {
  window.debugPermissions = debugPermissions;
  window.addTestPermission = addTestPermission;
  
  console.log('🔧 Debug functions available:');
  console.log('  - debugPermissions() - Debug current permission state');
  console.log('  - addTestPermission(clientCode) - Add test permission for specific client');
}

module.exports = { debugPermissions, addTestPermission };
