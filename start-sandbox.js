// Simple script to start the Amplify Gen2 sandbox which will create the DynamoDB tables

const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting Amplify Gen2 sandbox...');
console.log('This will create DynamoDB tables for your application based on amplify/data/resource.ts');

try {
  // Check if we're already running in the Amplify sandbox
  if (fs.existsSync('./amplify_outputs.json')) {
    console.log('amplify_outputs.json already exists. Sandbox may already be running.');
    console.log('To restart sandbox, delete this file and run this script again.');
  }
  
  // Run the Amplify sandbox command
  console.log('Executing npx ampx sandbox...');
  execSync('npx ampx sandbox', { stdio: 'inherit' });
} catch (error) {
  console.error('Error starting sandbox:', error.message);
  process.exit(1);
} 