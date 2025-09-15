#!/usr/bin/env node

/**
 * Development Setup Script for AccessAssist
 * Automates the setup process and checks for common issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Setting up AccessAssist for local development...\n');

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error(`❌ Node.js ${nodeVersion} is too old. Please install Node.js 18+ from https://nodejs.org/`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js ${nodeVersion} detected`);
}

// Check npm version
function checkNpmVersion() {
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion} detected`);
  } catch (error) {
    console.error('❌ npm is not installed. Please install npm.');
    process.exit(1);
  }
}

// Install dependencies
function installDependencies() {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: projectRoot });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error(error.message);
    process.exit(1);
  }
}

// Create .env.local if it doesn't exist
function setupEnvironment() {
  const envExamplePath = path.join(projectRoot, '.env.example');
  const envLocalPath = path.join(projectRoot, '.env.local');
  
  if (!fs.existsSync(envLocalPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log('📝 Creating .env.local from .env.example...');
      fs.copyFileSync(envExamplePath, envLocalPath);
      console.log('✅ .env.local created. You can edit this file to add your API keys.');
    } else {
      console.log('📝 Creating basic .env.local...');
      fs.writeFileSync(envLocalPath, `# AccessAssist Environment Configuration
VITE_NODE_ENV=development
VITE_LOG_LEVEL=info
VITE_ENABLE_DEBUG_MODE=false
`);
      console.log('✅ Basic .env.local created.');
    }
  } else {
    console.log('✅ .env.local already exists');
  }
}

// Create logs directory
function setupDirectories() {
  const logsDir = path.join(projectRoot, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Logs directory created');
  } else {
    console.log('✅ Logs directory already exists');
  }
}

// Check for git repository
function checkGitRepository() {
  const gitDir = path.join(projectRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log('📝 Initializing git repository...');
    try {
      execSync('git init', { cwd: projectRoot, stdio: 'inherit' });
      execSync('git add .', { cwd: projectRoot, stdio: 'inherit' });
      execSync('git commit -m "Initial commit: AccessAssist setup"', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Git repository initialized');
    } catch (error) {
      console.log('⚠️  Could not initialize git repository (this is optional)');
    }
  } else {
    console.log('✅ Git repository detected');
  }
}

// Check system capabilities
function checkSystemCapabilities() {
  console.log('\n🔍 Checking system capabilities...');
  
  // Check if running in container/codespace
  if (process.env.CODESPACES) {
    console.log('✅ Running in GitHub Codespaces');
    console.log('🌐 Application will be available at the forwarded port URL');
  } else if (process.env.GITPOD_WORKSPACE_URL) {
    console.log('✅ Running in Gitpod');
    console.log('🌐 Application will be available at the workspace URL');
  } else if (fs.existsSync('/.dockerenv')) {
    console.log('✅ Running in Docker container');
    console.log('🌐 Make sure to expose port 5173');
  } else {
    console.log('✅ Running on local system');
    console.log('🌐 Application will be available at http://localhost:5173');
  }
}

// Check for required files
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'src/App.tsx',
    'src/index.css',
    'src/main.tsx',
    'index.html'
  ];
  
  console.log('\n📋 Checking required files...');
  for (const file of requiredFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} is missing!`);
    }
  }
}

// Validate package.json scripts
function validatePackageJson() {
  console.log('\n📦 Validating package.json...');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = ['dev', 'build', 'preview'];
    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ Script: ${script}`);
      } else {
        console.log(`❌ Missing script: ${script}`);
      }
    }
  }
}

// Print next steps
function printNextSteps() {
  console.log('\n🎉 Setup complete!\n');
  
  console.log('Next steps:');
  console.log('1. Run \'npm run dev\' to start the development server');
  console.log('2. Open your browser to http://localhost:5173');
  console.log('3. Test the accessibility features:');
  console.log('   - Try voice input (microphone icon)');
  console.log('   - Test sign language recognition (Test Camera button)');
  console.log('   - Navigate with keyboard only (Tab key)');
  console.log('   - Try screen reader mode');
  console.log('   - Toggle high contrast mode\n');
  
  console.log('📚 Documentation:');
  console.log('   - README.md: Complete setup and usage guide');
  console.log('   - QUICK_START.md: 5-minute setup guide');
  console.log('   - DEPLOYMENT.md: Production deployment options');
  console.log('   - CONTRIBUTORS.md: Contributing guidelines\n');
  
  console.log('🐛 Troubleshooting:');
  console.log('   - Check browser console for errors');
  console.log('   - Ensure camera/microphone permissions are granted');
  console.log('   - Try different browsers if issues persist\n');
  
  console.log('Happy coding! 🚀');
}

// Main setup function
async function main() {
  try {
    checkNodeVersion();
    checkNpmVersion();
    installDependencies();
    setupEnvironment();
    setupDirectories();
    checkGitRepository();
    checkSystemCapabilities();
    checkRequiredFiles();
    validatePackageJson();
    printNextSteps();
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
main();