// Test script to verify case-insensitive email login
// Run this in the browser console

console.log('🧪 Email Case-Insensitive Test Script');

async function testEmailCaseInsensitive() {
  console.log('\n📋 Testing Email Case-Insensitive Login');
  
  const testEmails = [
    'simon@gocambria.com',
    'Simon@gocambria.com', 
    'SIMON@gocambria.com',
    'simon@GOCAMBRIA.com',
    'Simon@Gocambria.com'
  ];
  
  console.log('Testing these email variations:');
  testEmails.forEach((email, index) => {
    console.log(`  ${index + 1}. ${email}`);
  });
  
  console.log('\n📋 Step 1: Test Login with Different Cases');
  
  for (const email of testEmails) {
    console.log(`\n🔍 Testing: ${email}`);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: 'your_password_here' // Replace with actual password
        })
      });
      
      const data = await response.json();
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Success: ${data.success}`);
      
      if (data.success) {
        console.log(`  ✅ Login successful with: ${email}`);
        console.log(`  User: ${data.user.name} (${data.user.email})`);
        break; // Stop testing if one works
      } else {
        console.log(`  ❌ Login failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${email}:`, error);
    }
  }
  
  console.log('\n📋 Step 2: Test User Lookup');
  
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (sessionData.authenticated) {
      console.log('✅ User is authenticated');
      console.log('Current user:', sessionData.user);
      
      // Test user details API
      const userResponse = await fetch(`/api/users/${sessionData.user.id}`);
      const userData = await userResponse.json();
      
      if (userData.success) {
        console.log('✅ User details retrieved successfully');
        console.log('User email in database:', userData.user.email);
        console.log('User role:', userData.user.role);
        console.log('User status:', userData.user.status);
      } else {
        console.log('❌ Failed to get user details:', userData.error);
      }
    } else {
      console.log('❌ User is not authenticated');
    }
    
  } catch (error) {
    console.error('❌ Error checking session:', error);
  }
  
  console.log('\n📋 Step 3: Test Forgot Password (Case-Insensitive)');
  
  const testForgotPasswordEmail = 'simon@gocambria.com';
  
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testForgotPasswordEmail
      })
    });
    
    const data = await response.json();
    
    console.log(`Forgot password test for: ${testForgotPasswordEmail}`);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`Message: ${data.message || data.error}`);
    
  } catch (error) {
    console.error('❌ Error testing forgot password:', error);
  }
  
  console.log('\n🏁 Test Summary:');
  console.log('1. All email variations should work for login');
  console.log('2. User lookup should be case-insensitive');
  console.log('3. Forgot password should work with any case');
  
  console.log('\n💡 Expected Results:');
  console.log('- At least one email variation should login successfully');
  console.log('- User details should be retrieved correctly');
  console.log('- Forgot password should work regardless of case');
}

// Function to test specific email
async function testSpecificEmail(email, password) {
  console.log(`\n🔍 Testing specific email: ${email}`);
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    
    if (data.success) {
      console.log(`✅ Login successful!`);
      console.log(`User: ${data.user.name} (${data.user.email})`);
      console.log(`Role: ${data.user.role}`);
    } else {
      console.log(`❌ Login failed: ${data.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

// Export functions
window.testEmailCaseInsensitive = testEmailCaseInsensitive;
window.testSpecificEmail = testSpecificEmail;

console.log('🧪 Email case-insensitive test script loaded.');
console.log('Available functions:');
console.log('- testEmailCaseInsensitive() - Test all email variations');
console.log('- testSpecificEmail(email, password) - Test specific email');
console.log('\n⚠️ Note: Replace "your_password_here" with actual password in the test');
