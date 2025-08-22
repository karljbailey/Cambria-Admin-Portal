// Debug script specifically for CAM client issue
// Run this in the browser console

console.log('🔍 CAM Client Debug Script');

async function debugCAMClient() {
  console.log('\n📋 Step 1: Check Your CAM Permission');
  
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
      
      const camPermission = user.clientPermissions?.find(p => p.clientCode === 'CAM');
      if (camPermission) {
        console.log('✅ CAM permission found:', camPermission);
      } else {
        console.log('❌ CAM permission not found');
        console.log('Available permissions:', user.clientPermissions);
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting user details:', error);
    return;
  }
  
  console.log('\n📋 Step 2: Check All Clients in Google Sheets');
  
  try {
    // Get all clients (admin function)
    const allClientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}&forPermissionManagement=true`);
    const allClientsData = await allClientsResponse.json();
    
    console.log('All clients API response status:', allClientsResponse.status);
    
    if (allClientsResponse.ok) {
      const allClients = allClientsData.clients || [];
      console.log('Total clients in Google Sheets:', allClients.length);
      
      if (allClients.length > 0) {
        console.log('All client codes in Google Sheets:');
        allClients.forEach((client, index) => {
          console.log(`  ${index + 1}. "${client.clientCode}" (${client.clientName})`);
        });
        
        // Check if CAM exists
        const camClient = allClients.find(c => c.clientCode.toUpperCase() === 'CAM');
        if (camClient) {
          console.log('✅ CAM client found in Google Sheets:', camClient);
        } else {
          console.log('❌ CAM client NOT found in Google Sheets');
          console.log('Available client codes:', allClients.map(c => c.clientCode));
        }
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
  
  console.log('\n📋 Step 3: Test Filtered Clients API');
  
  try {
    // Test the filtered clients API
    const filteredClientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}`);
    const filteredClientsData = await filteredClientsResponse.json();
    
    console.log('Filtered clients API response status:', filteredClientsResponse.status);
    console.log('Filtered clients API response:', filteredClientsData);
    
    if (filteredClientsResponse.ok) {
      const filteredClients = filteredClientsData.clients || [];
      console.log('Clients returned for your user:', filteredClients.length);
      
      if (filteredClients.length > 0) {
        console.log('Your accessible clients:');
        filteredClients.forEach((client, index) => {
          console.log(`  ${index + 1}. "${client.clientCode}" (${client.clientName})`);
        });
      } else {
        console.log('⚠️ No clients returned - this confirms the issue');
      }
    } else {
      console.log('❌ Filtered clients API call failed');
      console.log('Error:', filteredClientsData.error);
    }
    
  } catch (error) {
    console.error('❌ Error getting filtered clients:', error);
  }
  
  console.log('\n🔍 Analysis:');
  console.log('1. You have permission for "CAM" client');
  console.log('2. The issue is likely that "CAM" client does not exist in Google Sheets');
  console.log('3. Or the client code in Google Sheets is different (e.g., "cam", "Cambria", etc.)');
  
  console.log('\n💡 Solutions:');
  console.log('- If CAM client doesn\'t exist in Google Sheets: Add it to the spreadsheet');
  console.log('- If client code is different: Update your permission to match Google Sheets');
  console.log('- If you should be admin: Use makeUserAdmin() to see all clients');
}

// Function to add CAM client to Google Sheets (if you're admin)
async function addCAMClientToSheets() {
  console.log('\n🔧 Add CAM Client to Google Sheets');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = sessionData.user.id;
    
    // Add CAM client
    const addClientResponse = await fetch(`/api/clients?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId: 'CAM_FOLDER_ID',
        clientCode: 'CAM',
        clientName: 'Cambria',
        fullName: 'Cambria Client',
        active: true,
        acosGoal: '15%',
        tacosGoal: '10%'
      })
    });
    
    const addClientData = await addClientResponse.json();
    
    if (addClientResponse.ok) {
      console.log('✅ CAM client added successfully');
      console.log('🔄 Please refresh the page to see the changes.');
    } else {
      console.log('❌ Failed to add CAM client:', addClientData.error);
    }
    
  } catch (error) {
    console.error('❌ Error adding CAM client:', error);
  }
}

// Function to update permission to match Google Sheets
async function updatePermissionToMatchSheets() {
  console.log('\n🔧 Update Permission to Match Google Sheets');
  
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
    
    if (allClients.length === 0) {
      console.log('⚠️ No clients in Google Sheets to match against');
      return;
    }
    
    // Find the first client that might be Cambria
    const cambriaClient = allClients.find(c => 
      c.clientName.toLowerCase().includes('cambria') || 
      c.clientCode.toLowerCase().includes('cam')
    );
    
    if (cambriaClient) {
      console.log('Found potential Cambria client:', cambriaClient);
      
      // Update permission to match Google Sheets
      const updatePermissionResponse = await fetch('/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          clientCode: cambriaClient.clientCode, // Use exact code from Google Sheets
          clientName: cambriaClient.clientName,
          permissionType: 'read',
          grantedBy: 'debug-script'
        })
      });
      
      const updatePermissionData = await updatePermissionResponse.json();
      
      if (updatePermissionData.success) {
        console.log('✅ Permission updated to match Google Sheets');
        console.log('🔄 Please refresh the page to see the changes.');
      } else {
        console.log('❌ Failed to update permission:', updatePermissionData.error);
      }
    } else {
      console.log('⚠️ No Cambria-like client found in Google Sheets');
      console.log('Available clients:', allClients.map(c => `${c.clientCode} (${c.clientName})`));
    }
    
  } catch (error) {
    console.error('❌ Error updating permission:', error);
  }
}

// Export functions
window.debugCAMClient = debugCAMClient;
window.addCAMClientToSheets = addCAMClientToSheets;
window.updatePermissionToMatchSheets = updatePermissionToMatchSheets;

// Auto-run debug
debugCAMClient();

console.log('🔍 CAM client debug script loaded.');
console.log('Available functions:');
console.log('- debugCAMClient() - Debug CAM client issue');
console.log('- addCAMClientToSheets() - Add CAM client to Google Sheets (admin only)');
console.log('- updatePermissionToMatchSheets() - Update permission to match Google Sheets');
