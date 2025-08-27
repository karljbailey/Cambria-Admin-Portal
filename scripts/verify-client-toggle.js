const fetch = require('node-fetch');

// Simple verification script for client toggle functionality
async function verifyClientToggle() {
  console.log('🔍 Verifying Client Toggle Functionality...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // Test 1: Check if the server is running
    console.log('📡 Test 1: Checking server connectivity...');
    const response = await fetch(baseUrl);
    
    if (response.ok) {
      console.log('✅ Server is running and responding');
    } else {
      console.log(`❌ Server responded with status: ${response.status}`);
      return;
    }

    // Test 2: Check if the clients API endpoint exists
    console.log('\n📡 Test 2: Checking clients API endpoint...');
    const clientsResponse = await fetch(`${baseUrl}/api/clients`);
    
    if (clientsResponse.status === 400) {
      console.log('✅ Clients API endpoint exists (returning 400 for missing userId - expected)');
    } else if (clientsResponse.status === 200) {
      console.log('✅ Clients API endpoint exists and working');
    } else {
      console.log(`⚠️ Clients API endpoint responded with status: ${clientsResponse.status}`);
    }

    // Test 3: Check if the PATCH method is available
    console.log('\n📡 Test 3: Checking PATCH method availability...');
    const patchResponse = await fetch(`${baseUrl}/api/clients`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientCode: 'TEST',
        active: true,
      }),
    });
    
    if (patchResponse.status === 400) {
      console.log('✅ PATCH method is available (returning 400 for missing userId - expected)');
    } else if (patchResponse.status === 405) {
      console.log('❌ PATCH method not allowed on this endpoint');
    } else {
      console.log(`⚠️ PATCH method responded with status: ${patchResponse.status}`);
    }

    // Test 4: Check if the main page loads
    console.log('\n📡 Test 4: Checking main page accessibility...');
    const pageResponse = await fetch(`${baseUrl}/`);
    
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      if (html.includes('Loading...') || html.includes('Cambria') || html.includes('Dashboard')) {
        console.log('✅ Main page is accessible and loading');
      } else {
        console.log('⚠️ Main page loaded but content seems unexpected');
      }
    } else {
      console.log(`❌ Main page failed to load: ${pageResponse.status}`);
    }

    console.log('\n🎉 Verification completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open your browser and navigate to http://localhost:3000');
    console.log('2. Log in with your credentials');
    console.log('3. Navigate to the dashboard (main page)');
    console.log('4. Find a client in the table and click the three dots menu');
    console.log('5. Click "Activate" or "Deactivate" to test the functionality');
    console.log('6. Check the browser console for debug logs');
    console.log('7. Verify the client status changes in the table');

    console.log('\n🔍 Debug Information:');
    console.log('- The button should have e.stopPropagation() to prevent navigation');
    console.log('- Console logs should show: "🔄 Toggle client status called"');
    console.log('- Success should show: "✅ Update successful"');
    console.log('- Client status should update in the table immediately');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the development server is running:');
      console.error('npm run dev');
    }
  }
}

// Run the verification
verifyClientToggle().catch(console.error);

