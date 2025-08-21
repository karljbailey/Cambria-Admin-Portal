const { execSync } = require('child_process');

console.log('Running tests...');

try {
  const result = execSync('npm test', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ All tests passed!');
  console.log(result);
} catch (error) {
  console.log('❌ Some tests failed:');
  console.log(error.stdout);
  console.log(error.stderr);
  process.exit(1);
}
