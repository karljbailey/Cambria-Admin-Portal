// Manual test script for permission system
// Run this in the browser console to test the permission system

console.log('🧪 Testing Permission System...');

// Test 1: Check if the permission system is properly implemented
async function testPermissionSystem() {
  console.log('\n📋 Test 1: Checking API endpoints...');
  
  try {
    // Test 1a: Call /api/clients without userId (should return 401)
    console.log('Testing /api/clients without userId...');
    const response1 = await fetch('/api/clients');
    const data1 = await response1.json();
    console.log('Response status:', response1.status);
    console.log('Response data:', data1);
    
    if (response1.status === 401 && data1.error === 'Authentication required') {
      console.log('✅ Test 1a PASSED: API correctly requires authentication');
    } else {
      console.log('❌ Test 1a FAILED: API should require authentication');
    }
    
    // Test 1b: Call /api/clients with invalid userId (should return 403)
    console.log('\nTesting /api/clients with invalid userId...');
    const response2 = await fetch('/api/clients?userId=invalid-user');
    const data2 = await response2.json();
    console.log('Response status:', response2.status);
    console.log('Response data:', data2);
    
    if (response2.status === 403 && data2.error === 'User not found') {
      console.log('✅ Test 1b PASSED: API correctly handles invalid user');
    } else {
      console.log('❌ Test 1b FAILED: API should handle invalid user correctly');
    }
    
  } catch (error) {
    console.error('❌ Test 1 ERROR:', error);
  }
}

// Test 2: Check if the frontend is properly integrated
function testFrontendIntegration() {
  console.log('\n📋 Test 2: Checking frontend integration...');
  
  // Check if useClientPermissions hook is available
  if (typeof window !== 'undefined') {
    console.log('✅ Frontend environment detected');
    
    // Check if the permission system is loaded
    const permissionElements = document.querySelectorAll('[data-testid*="permission"]');
    console.log('Permission-related elements found:', permissionElements.length);
    
    // Check if there are any error messages
    const errorElements = document.querySelectorAll('.error, [class*="error"], [id*="error"]');
    console.log('Error elements found:', errorElements.length);
    
    if (errorElements.length > 0) {
      console.log('⚠️ Potential errors found:', Array.from(errorElements).map(el => el.textContent));
    }
    
  } else {
    console.log('❌ Not in browser environment');
  }
}

// Test 3: Check if the permission logic is working
function testPermissionLogic() {
  console.log('\n📋 Test 3: Testing permission logic...');
  
  // Test case-insensitive matching
  const testCases = [
    { userPermissions: ['CAM'], requestedClient: 'CAM', expected: true },
    { userPermissions: ['CAM'], requestedClient: 'cam', expected: true },
    { userPermissions: ['cam'], requestedClient: 'CAM', expected: true },
    { userPermissions: ['CAM'], requestedClient: 'TEST', expected: false },
    { userPermissions: [], requestedClient: 'CAM', expected: false },
  ];
  
  testCases.forEach((testCase, index) => {
    const hasPermission = testCase.userPermissions.some(permission => 
      permission.toUpperCase() === testCase.requestedClient.toUpperCase()
    );
    
    if (hasPermission === testCase.expected) {
      console.log(`✅ Test case ${index + 1} PASSED: ${testCase.userPermissions} vs ${testCase.requestedClient}`);
    } else {
      console.log(`❌ Test case ${index + 1} FAILED: ${testCase.userPermissions} vs ${testCase.requestedClient}`);
    }
  });
}

// Test 4: Check if the current user has proper permissions
async function testCurrentUserPermissions() {
  console.log('\n📋 Test 4: Checking current user permissions...');
  
  try {
    // Check if user is authenticated
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    console.log('Session data:', sessionData);
    
    if (sessionData.authenticated) {
      console.log('✅ User is authenticated');
      console.log('User ID:', sessionData.user?.id);
      console.log('User role:', sessionData.user?.role);
      
      // Test with current user
      if (sessionData.user?.id) {
        const clientsResponse = await fetch(`/api/clients?userId=${sessionData.user.id}`);
        const clientsData = await clientsResponse.json();
        
        console.log('Clients response status:', clientsResponse.status);
        console.log('Clients data:', clientsData);
        
        if (clientsResponse.status === 200) {
          console.log('✅ User can access clients API');
          console.log('Number of accessible clients:', clientsData.clients?.length || 0);
        } else {
          console.log('❌ User cannot access clients API');
        }
      }
    } else {
      console.log('❌ User is not authenticated');
    }
    
  } catch (error) {
    console.error('❌ Test 4 ERROR:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Permission System Tests...\n');
  
  await testPermissionSystem();
  testFrontendIntegration();
  testPermissionLogic();
  await testCurrentUserPermissions();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Check the console output above for test results');
  console.log('- Look for ✅ PASSED and ❌ FAILED indicators');
  console.log('- If you see errors, the permission system may need fixes');
}

// Export for manual testing
window.testPermissionSystem = testPermissionSystem;
window.testFrontendIntegration = testFrontendIntegration;
window.testPermissionLogic = testPermissionLogic;
window.testCurrentUserPermissions = testCurrentUserPermissions;
window.runAllTests = runAllTests;

// Auto-run tests if this script is loaded
if (typeof window !== 'undefined') {
  // Wait a bit for the page to load
  setTimeout(() => {
    runAllTests();
  }, 1000);
}

console.log('🧪 Permission test script loaded. Run runAllTests() to test the system.');
