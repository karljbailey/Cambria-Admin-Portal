// Debug script to troubleshoot permission issues
// Run this in the browser console to see what's happening

console.log('🔍 Permission Debug Script');

async function debugPermissions() {
  console.log('\n📋 Step 1: Check Authentication');
  
  try {
    // Check if user is authenticated
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    console.log('Session data:', sessionData);
    
    if (!sessionData.authenticated) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    console.log('✅ User is authenticated');
    console.log('User ID:', sessionData.user?.id);
    console.log('User role:', sessionData.user?.role);
    console.log('User email:', sessionData.user?.email);
    
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return;
  }
  
  console.log('\n📋 Step 2: Check User Permissions');
  
  try {
    // Get user details from Firebase
    const userResponse = await fetch(`/api/users/${sessionData.user.id}`);
    const userData = await userResponse.json();
    
    console.log('User details:', userData);
    
    if (userData.success) {
      const user = userData.user;
      console.log('User role:', user.role);
      console.log('Client permissions:', user.clientPermissions);
      console.log('Number of permissions:', user.clientPermissions?.length || 0);
      
      if (user.clientPermissions && user.clientPermissions.length > 0) {
        console.log('Permission details:');
        user.clientPermissions.forEach((perm, index) => {
          console.log(`  ${index + 1}. Client: ${perm.clientCode}, Type: ${perm.permissionType}`);
        });
      } else {
        console.log('⚠️ No client permissions found');
      }
    } else {
      console.log('❌ Failed to get user details:', userData.error);
    }
    
  } catch (error) {
    console.error('❌ Error getting user details:', error);
  }
  
  console.log('\n📋 Step 3: Test Clients API');
  
  try {
    // Test the clients API
    const clientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}`);
    const clientsData = await clientsResponse.json();
    
    console.log('Clients API response status:', clientsResponse.status);
    console.log('Clients API response:', clientsData);
    
    if (clientsResponse.ok) {
      console.log('✅ Clients API call successful');
      console.log('Number of clients returned:', clientsData.clients?.length || 0);
      
      if (clientsData.clients && clientsData.clients.length > 0) {
        console.log('Available clients:');
        clientsData.clients.forEach((client, index) => {
          console.log(`  ${index + 1}. ${client.clientCode} - ${client.clientName}`);
        });
      } else {
        console.log('⚠️ No clients returned - this might be the issue');
      }
    } else {
      console.log('❌ Clients API call failed');
      console.log('Error:', clientsData.error);
    }
    
  } catch (error) {
    console.error('❌ Error calling clients API:', error);
  }
  
  console.log('\n📋 Step 4: Check Firebase Configuration');
  
  try {
    // Test if Firebase is configured
    const firebaseResponse = await fetch('/api/debug/permissions');
    const firebaseData = await firebaseResponse.json();
    
    console.log('Firebase debug response:', firebaseData);
    
  } catch (error) {
    console.log('⚠️ Firebase debug endpoint not available');
  }
  
  console.log('\n📋 Step 5: Check All Available Clients (Admin Only)');
  
  try {
    // Try to get all clients (admin function)
    const allClientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}&forPermissionManagement=true`);
    const allClientsData = await allClientsResponse.json();
    
    console.log('All clients API response status:', allClientsResponse.status);
    console.log('All clients API response:', allClientsData);
    
    if (allClientsResponse.ok) {
      console.log('✅ All clients API call successful');
      console.log('Total clients in system:', allClientsData.clients?.length || 0);
      
      if (allClientsData.clients && allClientsData.clients.length > 0) {
        console.log('All available clients:');
        allClientsData.clients.forEach((client, index) => {
          console.log(`  ${index + 1}. ${client.clientCode} - ${client.clientName}`);
        });
      }
    } else {
      console.log('❌ All clients API call failed');
      console.log('Error:', allClientsData.error);
    }
    
  } catch (error) {
    console.error('❌ Error calling all clients API:', error);
  }
  
  console.log('\n🏁 Debug Summary:');
  console.log('1. Check if user is authenticated');
  console.log('2. Check if user has client permissions assigned');
  console.log('3. Check if clients API is working');
  console.log('4. Check if Firebase is configured');
  console.log('5. Check if there are any clients in the system');
  
  console.log('\n💡 Common Issues:');
  console.log('- User has no client permissions assigned');
  console.log('- Firebase not configured properly');
  console.log('- No clients exist in the system');
  console.log('- User role is not set correctly');
  console.log('- Permission data is malformed');
}

// Export for manual testing
window.debugPermissions = debugPermissions;

// Auto-run debug
debugPermissions();

console.log('🔍 Debug script loaded. Run debugPermissions() to troubleshoot permissions.');
