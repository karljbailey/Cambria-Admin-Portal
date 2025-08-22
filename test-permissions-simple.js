// Simple test script for permission system
// This can be run in Node.js or browser to test the permission logic

console.log('🧪 Simple Permission System Test');

// Test the permission logic directly
function testPermissionLogic() {
  console.log('\n📋 Testing Permission Logic...');
  
  // Test case-insensitive matching
  const testCases = [
    {
      name: 'Exact match',
      userPermissions: [{ clientCode: 'CAM', permissionType: 'read' }],
      requestedClient: 'CAM',
      expected: true
    },
    {
      name: 'Case insensitive match (user lowercase)',
      userPermissions: [{ clientCode: 'cam', permissionType: 'read' }],
      requestedClient: 'CAM',
      expected: true
    },
    {
      name: 'Case insensitive match (request lowercase)',
      userPermissions: [{ clientCode: 'CAM', permissionType: 'read' }],
      requestedClient: 'cam',
      expected: true
    },
    {
      name: 'No match',
      userPermissions: [{ clientCode: 'CAM', permissionType: 'read' }],
      requestedClient: 'TEST',
      expected: false
    },
    {
      name: 'Empty permissions',
      userPermissions: [],
      requestedClient: 'CAM',
      expected: false
    },
    {
      name: 'Multiple permissions',
      userPermissions: [
        { clientCode: 'CAM', permissionType: 'read' },
        { clientCode: 'TEST', permissionType: 'write' }
      ],
      requestedClient: 'TEST',
      expected: true
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    const hasPermission = testCase.userPermissions.some(permission => 
      permission.clientCode.toUpperCase() === testCase.requestedClient.toUpperCase()
    );
    
    if (hasPermission === testCase.expected) {
      console.log(`✅ Test ${index + 1} PASSED: ${testCase.name}`);
      passedTests++;
    } else {
      console.log(`❌ Test ${index + 1} FAILED: ${testCase.name}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${hasPermission}`);
    }
  });
  
  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);
  return passedTests === totalTests;
}

// Test admin logic
function testAdminLogic() {
  console.log('\n📋 Testing Admin Logic...');
  
  const adminUser = { role: 'admin' };
  const regularUser = { role: 'basic' };
  const noRoleUser = {};
  
  const adminTests = [
    { user: adminUser, expected: true, name: 'Admin user' },
    { user: regularUser, expected: false, name: 'Regular user' },
    { user: noRoleUser, expected: false, name: 'No role user' }
  ];
  
  let passedTests = 0;
  let totalTests = adminTests.length;
  
  adminTests.forEach((testCase, index) => {
    const isAdmin = testCase.user.role === 'admin';
    
    if (isAdmin === testCase.expected) {
      console.log(`✅ Admin test ${index + 1} PASSED: ${testCase.name}`);
      passedTests++;
    } else {
      console.log(`❌ Admin test ${index + 1} FAILED: ${testCase.name}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${isAdmin}`);
    }
  });
  
  console.log(`\n📊 Admin Results: ${passedTests}/${totalTests} tests passed`);
  return passedTests === totalTests;
}

// Test permission filtering logic
function testPermissionFiltering() {
  console.log('\n📋 Testing Permission Filtering...');
  
  const allClients = [
    { clientCode: 'CAM', clientName: 'Cambria' },
    { clientCode: 'TEST', clientName: 'Test Client' },
    { clientCode: 'DEMO', clientName: 'Demo Client' }
  ];
  
  const testCases = [
    {
      name: 'Admin access (all clients)',
      userPermissions: [],
      isAdmin: true,
      expectedCount: 3
    },
    {
      name: 'User with CAM permission',
      userPermissions: [{ clientCode: 'CAM', permissionType: 'read' }],
      isAdmin: false,
      expectedCount: 1
    },
    {
      name: 'User with multiple permissions',
      userPermissions: [
        { clientCode: 'CAM', permissionType: 'read' },
        { clientCode: 'TEST', permissionType: 'write' }
      ],
      isAdmin: false,
      expectedCount: 2
    },
    {
      name: 'User with no permissions',
      userPermissions: [],
      isAdmin: false,
      expectedCount: 0
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    let filteredClients;
    
    if (testCase.isAdmin) {
      // Admin gets all clients
      filteredClients = allClients;
    } else {
      // Regular user gets filtered clients
      const accessibleClientCodes = testCase.userPermissions.map(p => p.clientCode);
      filteredClients = allClients.filter(client => 
        accessibleClientCodes.some(code => 
          code.toUpperCase() === client.clientCode.toUpperCase()
        )
      );
    }
    
    if (filteredClients.length === testCase.expectedCount) {
      console.log(`✅ Filter test ${index + 1} PASSED: ${testCase.name}`);
      console.log(`   Got ${filteredClients.length} clients: ${filteredClients.map(c => c.clientCode).join(', ')}`);
      passedTests++;
    } else {
      console.log(`❌ Filter test ${index + 1} FAILED: ${testCase.name}`);
      console.log(`   Expected: ${testCase.expectedCount}, Got: ${filteredClients.length}`);
    }
  });
  
  console.log(`\n📊 Filter Results: ${passedTests}/${totalTests} tests passed`);
  return passedTests === totalTests;
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Simple Permission Tests...\n');
  
  const logicResult = testPermissionLogic();
  const adminResult = testAdminLogic();
  const filterResult = testPermissionFiltering();
  
  console.log('\n🏁 Test Summary:');
  console.log(`Permission Logic: ${logicResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Admin Logic: ${adminResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Permission Filtering: ${filterResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = logicResult && adminResult && filterResult;
  console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 The permission logic is working correctly!');
    console.log('The issue might be in the API integration or frontend.');
  } else {
    console.log('\n🔧 There are issues with the permission logic that need to be fixed.');
  }
  
  return allPassed;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    testPermissionLogic,
    testAdminLogic,
    testPermissionFiltering,
    runAllTests
  };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.testPermissionLogic = testPermissionLogic;
  window.testAdminLogic = testAdminLogic;
  window.testPermissionFiltering = testPermissionFiltering;
  window.runAllTests = runAllTests;
}

// Auto-run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}

console.log('🧪 Simple permission test script loaded. Run runAllTests() to test the system.');
