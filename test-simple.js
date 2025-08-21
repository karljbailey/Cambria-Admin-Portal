const { execSync } = require('child_process');

console.log('🧪 Running tests to verify fixes...\n');

try {
  // Run a single test first to check if the setup works
  console.log('Testing auth utilities...');
  execSync('npm test -- --testPathPattern=auth.test.ts --verbose', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ Auth tests passed!\n');
  
  // Run reset codes test
  console.log('Testing reset codes...');
  execSync('npm test -- --testPathPattern=reset-codes.test.ts --verbose', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ Reset codes tests passed!\n');
  
  // Run login component test
  console.log('Testing login component...');
  execSync('npm test -- --testPathPattern=login.test.tsx --verbose', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ Login component tests passed!\n');
  
  console.log('🎉 All tests are now passing!');
  
} catch (error) {
  console.log('❌ Some tests still failing:');
  console.log(error.stdout);
  console.log(error.stderr);
  process.exit(1);
}

