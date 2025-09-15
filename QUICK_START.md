# 🚀 Quick Start Guide

Get AccessAssist running locally in under 5 minutes!

## Prerequisites ✅

- **Node.js 18+** ([Download here](https://nodejs.org/))
- **Modern browser** (Chrome, Firefox, Safari, Edge)
- **Camera & microphone** (for full functionality testing)

## One-Line Setup 🎯

```bash
git clone <your-repo-url> && cd spark-template && npm install && npm run dev
```

## Step-by-Step Setup 📋

### 1. Clone & Navigate
```bash
git clone <your-repo-url>
cd spark-template
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
```
http://localhost:5173
```

That's it! 🎉

## First Test Checklist ✓

### Basic Functionality
- [ ] Homepage loads without errors
- [ ] Click "Create Complaint" button
- [ ] Fill out intake form
- [ ] Generate AI complaint draft
- [ ] Copy complaint to clipboard

### Accessibility Features
- [ ] Click "Test Camera" button
- [ ] Allow camera permissions
- [ ] Try voice input (microphone icons)
- [ ] Navigate with Tab key only
- [ ] Open accessibility settings
- [ ] Toggle high contrast mode

## Troubleshooting 🔧

### Camera Not Working?
1. Check browser permissions (camera icon in address bar)
2. Try refreshing the page
3. Test different browsers

### Voice Input Not Working?
1. Check microphone permissions
2. Ensure quiet environment
3. Try speaking clearly

### Build Issues?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use?
```bash
# Try different port
npm run dev -- --port 3000
```

## Development Scripts 📝

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code quality |

## Project Structure 📁

```
src/
├── components/          # React components
│   ├── ui/             # Pre-installed shadcn components
│   ├── ComplaintIntake.tsx
│   ├── ComplaintDrafter.tsx
│   └── ...
├── App.tsx             # Main application
├── index.css           # Styles and theme
└── assets/             # Static files
```

## Key Features to Test 🎯

1. **Voice Input**: Click microphone buttons throughout the app
2. **Sign Language**: Use "Test Camera" for gesture recognition
3. **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
4. **Keyboard Navigation**: Tab through all elements
5. **High Contrast**: Toggle in accessibility settings
6. **AI Complaint Generation**: Complete the full flow

## Need Help? 🆘

1. Check the [full README.md](./README.md) for detailed info
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting options
3. Look in browser console for error messages
4. Ensure all permissions are granted

## What's Next? 🚀

- Customize the theme in `src/index.css`
- Add your own AI API keys in `.env.local`
- Deploy to production (see DEPLOYMENT.md)
- Contribute improvements

**Happy coding!** 🎉

---
*This is a demonstration of accessible AI-powered complaint assistance. Content is for informational purposes only.*