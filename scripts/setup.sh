#!/bin/bash

# AccessAssist Setup Script
# This script automates the setup process for local development

set -e  # Exit on any error

echo "🚀 Setting up AccessAssist for local development..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! npx semver "$NODE_VERSION" -r ">=$REQUIRED_VERSION" &> /dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm version $NPM_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ .env.local created. You can edit this file to add your API keys."
else
    echo "✅ .env.local already exists"
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: AccessAssist setup"
    echo "✅ Git repository initialized"
fi

# Create logs directory
mkdir -p logs
echo "✅ Logs directory created"

# Check browser capabilities
echo
echo "🔍 Checking system capabilities..."

# Check if running in a container/codespace
if [ -n "$CODESPACES" ]; then
    echo "✅ Running in GitHub Codespaces"
    echo "🌐 Application will be available at the forwarded port URL"
elif [ -n "$GITPOD_WORKSPACE_URL" ]; then
    echo "✅ Running in Gitpod"
    echo "🌐 Application will be available at the workspace URL"
elif [ -f "/.dockerenv" ]; then
    echo "✅ Running in Docker container"
    echo "🌐 Make sure to expose port 5173"
else
    echo "✅ Running on local system"
    echo "🌐 Application will be available at http://localhost:5173"
fi

# Check for HTTPS requirements
echo
echo "🔒 HTTPS Configuration (recommended for full functionality):"
echo "   - Camera access requires HTTPS in production"
echo "   - Microphone access requires HTTPS in production"
echo "   - See DEPLOYMENT.md for HTTPS setup instructions"

echo
echo "🎉 Setup complete!"
echo
echo "Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Open your browser to http://localhost:5173"
echo "3. Test the accessibility features:"
echo "   - Try voice input (microphone icon)"
echo "   - Test sign language recognition (Test Camera button)"
echo "   - Navigate with keyboard only (Tab key)"
echo "   - Try screen reader mode"
echo "   - Toggle high contrast mode"
echo
echo "📚 Documentation:"
echo "   - README.md: Complete setup and usage guide"
echo "   - DEPLOYMENT.md: Production deployment options"
echo "   - src/prd.md: Product requirements and design decisions"
echo
echo "🐛 Troubleshooting:"
echo "   - Check browser console for errors"
echo "   - Ensure camera/microphone permissions are granted"
echo "   - Try different browsers if issues persist"
echo
echo "Happy coding! 🚀"