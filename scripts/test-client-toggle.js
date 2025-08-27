const fetch = require('node-fetch');

// Test client toggle functionality
async function testClientToggle() {
  console.log('🧪 Testing Client Toggle Functionality...\n');

  // Configuration
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const testUserId = process.env.TEST_USER_ID;
  const testClientCode = process.env.TEST_CLIENT_CODE;

  if (!testUserId || !testClientCode) {
    console.error('❌ Missing test configuration:');
    console.error('Please set the following environment variables:');
    console.error('- TEST_USER_ID: A valid user ID to test with');
    console.error('- TEST_CLIENT_CODE: A valid client code to test with');
    console.error('- NEXT_PUBLIC_BASE_URL: Your application URL (default: http://localhost:3000)');
    return;
  }

  console.log('📋 Test Configuration:');
  console.log(`- Base URL: ${baseUrl}`);
  console.log(`- User ID: ${testUserId}`);
  console.log(`- Client Code: ${testClientCode}\n`);

  try {
    // Step 1: Get current client status
    console.log('🔍 Step 1: Getting current client status...');
    const getResponse = await fetch(`${baseUrl}/api/clients?userId=${testUserId}`);
    
    if (!getResponse.ok) {
      console.error('❌ Failed to get clients:', getResponse.status, getResponse.statusText);
      const errorData = await getResponse.json();
      console.error('Error details:', errorData);
      return;
    }

    const clientsData = await getResponse.json();
    const testClient = clientsData.clients.find(client => client.clientCode === testClientCode);
    
    if (!testClient) {
      console.error(`❌ Client ${testClientCode} not found in the system`);
      return;
    }

    console.log(`✅ Found client: ${testClient.clientName} (${testClient.clientCode})`);
    console.log(`📊 Current status: ${testClient.active ? 'Active' : 'Inactive'}\n`);

    // Step 2: Toggle client status
    const newStatus = !testClient.active;
    console.log(`🔄 Step 2: Toggling client status to ${newStatus ? 'Active' : 'Inactive'}...`);
    
    const patchResponse = await fetch(`${baseUrl}/api/clients?userId=${testUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientCode: testClientCode,
        active: newStatus,
      }),
    });

    console.log(`📥 PATCH Response Status: ${patchResponse.status}`);

    if (!patchResponse.ok) {
      console.error('❌ Failed to update client status:', patchResponse.status, patchResponse.statusText);
      const errorData = await patchResponse.json();
      console.error('Error details:', errorData);
      return;
    }

    const updateData = await patchResponse.json();
    console.log('✅ Update successful:', updateData);

    // Step 3: Verify the change
    console.log('\n🔍 Step 3: Verifying the change...');
    const verifyResponse = await fetch(`${baseUrl}/api/clients?userId=${testUserId}`);
    
    if (!verifyResponse.ok) {
      console.error('❌ Failed to verify client status:', verifyResponse.status, verifyResponse.statusText);
      return;
    }

    const verifyData = await verifyResponse.json();
    const updatedClient = verifyData.clients.find(client => client.clientCode === testClientCode);
    
    if (!updatedClient) {
      console.error('❌ Could not find updated client');
      return;
    }

    console.log(`📊 Updated status: ${updatedClient.active ? 'Active' : 'Inactive'}`);
    
    if (updatedClient.active === newStatus) {
      console.log('✅ Status change verified successfully!');
    } else {
      console.error('❌ Status change verification failed');
    }

    // Step 4: Toggle back to original status
    console.log(`\n🔄 Step 4: Toggling back to original status (${testClient.active ? 'Active' : 'Inactive'})...`);
    
    const revertResponse = await fetch(`${baseUrl}/api/clients?userId=${testUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientCode: testClientCode,
        active: testClient.active,
      }),
    });

    if (!revertResponse.ok) {
      console.error('❌ Failed to revert client status:', revertResponse.status, revertResponse.statusText);
      return;
    }

    const revertData = await revertResponse.json();
    console.log('✅ Revert successful:', revertData);

    console.log('\n🎉 All tests completed successfully!');
    console.log('📝 Summary:');
    console.log(`- Client: ${testClient.clientName} (${testClient.clientCode})`);
    console.log(`- Original status: ${testClient.active ? 'Active' : 'Inactive'}`);
    console.log(`- Toggled to: ${newStatus ? 'Active' : 'Inactive'}`);
    console.log(`- Reverted to: ${testClient.active ? 'Active' : 'Inactive'}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the development server is running:');
      console.error('npm run dev');
    }
  }
}

// Run the test
testClientToggle().catch(console.error);

