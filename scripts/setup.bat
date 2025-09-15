@echo off
REM AccessAssist Setup Script for Windows
REM This script automates the setup process for local development

echo 🚀 Setting up AccessAssist for local development...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js version %NODE_VERSION% detected

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

REM Get npm version
for /f "tokens=1" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ npm version %NPM_VERSION% detected

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo 📝 Creating .env.local from .env.example...
    copy .env.example .env.local >nul
    echo ✅ .env.local created. You can edit this file to add your API keys.
) else (
    echo ✅ .env.local already exists
)

REM Create logs directory
if not exist "logs" mkdir logs
echo ✅ Logs directory created

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Run 'npm run dev' to start the development server
echo 2. Open your browser to http://localhost:5173
echo 3. Test the accessibility features:
echo    - Try voice input (microphone icon)
echo    - Test sign language recognition (Test Camera button)
echo    - Navigate with keyboard only (Tab key)
echo    - Try screen reader mode
echo    - Toggle high contrast mode
echo.
echo 📚 Documentation:
echo    - README.md: Complete setup and usage guide
echo    - DEPLOYMENT.md: Production deployment options
echo    - src/prd.md: Product requirements and design decisions
echo.
echo 🐛 Troubleshooting:
echo    - Check browser console for errors
echo    - Ensure camera/microphone permissions are granted
echo    - Try different browsers if issues persist
echo.
echo Happy coding! 🚀
pause