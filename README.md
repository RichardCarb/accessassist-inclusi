# AccessAssist - Inclusive AI for Complaints

A comprehensive accessibility-first platform for creating, managing, and tracking complaint letters with AI assistance. Features voice input, real-time UK sign language recognition, screen reader support, and plain language guidance.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ or 20+ (recommended)
- **npm** or **yarn**
- Modern web browser with camera/microphone access for full functionality

### Installation & Setup

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd spark-template
npm install
```

2. **Development server:**
```bash
npm run dev
```

3. **Open in browser:**
```
http://localhost:5173
```

That's it! The application will run locally with all features available.

## 🛠️ Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📋 Testing Features

### Core Functionality
- ✅ **Voice Input**: Click microphone buttons to test speech-to-text
- ✅ **Sign Language Recognition**: Use "Test Camera" button on homepage
- ✅ **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
- ✅ **Keyboard Navigation**: Tab through all interactive elements
- ✅ **High Contrast**: Toggle in accessibility settings
- ✅ **Complaint Generation**: Full AI-powered complaint drafting

### Browser Requirements
- **Camera Access**: Required for sign language recognition
- **Microphone Access**: Required for voice input
- **HTTPS**: Some features require secure context (use localhost for testing)

## 🔧 Configuration

### Environment Setup (Optional)
The application works out-of-the-box without API keys for basic functionality. For enhanced AI features, you can add:

```bash
# Create .env.local file (optional)
VITE_OPENAI_API_KEY=your_key_here
VITE_SPEECH_API_KEY=your_key_here
```

### Accessibility Testing

#### Screen Reader Testing
```bash
# Windows
# Install NVDA (free): https://www.nvaccess.org/download/

# macOS
# VoiceOver is built-in: Cmd + F5

# Test all major flows:
# 1. Navigate homepage with screen reader
# 2. Complete complaint intake process
# 3. Review generated complaint
# 4. Test accessibility controls
```

#### Keyboard Navigation Testing
- Tab through all interactive elements
- Ensure visible focus indicators
- Test Escape key functionality
- Verify no keyboard traps

#### Visual Testing
- Toggle high contrast mode
- Test different font sizes
- Verify color contrast ratios
- Test with reduced motion

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components (pre-installed)
│   ├── AccessibilityControls.tsx
│   ├── ComplaintIntake.tsx
│   ├── ComplaintDrafter.tsx
│   ├── ComplaintTracker.tsx
│   ├── EscalationGuidance.tsx
│   ├── CameraTest.tsx
│   └── ...
├── lib/                 # Utilities
│   └── utils.ts
├── assets/              # Static assets
│   ├── images/
│   ├── video/
│   ├── audio/
│   └── documents/
├── App.tsx              # Main application
├── index.css            # Styles and theme
└── main.tsx             # Entry point (do not modify)
```

## 🎯 Key Features to Test

### 1. Complaint Creation Flow
1. Click "Create Complaint" on homepage
2. Fill out guided intake form
3. Test voice input on text fields
4. Generate AI-powered complaint draft
5. Export to email/copy to clipboard

### 2. Sign Language Recognition
1. Click "Test Camera" on homepage
2. Allow camera permissions
3. Test hand tracking and gesture recognition
4. Try basic UK sign language signs

### 3. Accessibility Features
1. Open accessibility settings
2. Toggle high contrast mode
3. Change font size
4. Enable reduced motion
5. Test screen reader compatibility

### 4. Tracking & Escalation
1. Create multiple complaints
2. View complaint tracker
3. Test status updates
4. Try escalation guidance

## 🐛 Troubleshooting

### Camera Issues
- **Black screen**: Check browser permissions for camera access
- **"Initializing camera"**: Refresh page and allow permissions
- **No detection**: Ensure good lighting and hand visibility

### Voice Input Issues
- **Not working**: Check microphone permissions in browser
- **Poor recognition**: Speak clearly and ensure quiet environment

### Performance Issues
- **Slow loading**: Check browser console for errors
- **Memory usage**: Sign language recognition uses significant resources

### Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## 🌐 Browser Support

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (macOS/iOS)
- **Mobile**: Responsive design, touch-friendly

## 📊 Accessibility Compliance

- **WCAG 2.2 AA**: Target compliance level
- **Keyboard Navigation**: Complete keyboard operability
- **Screen Readers**: NVDA, JAWS, VoiceOver tested
- **Color Contrast**: 4.5:1 minimum ratio
- **Text Size**: Scalable up to 200%
- **Reduced Motion**: Respects user preferences

## 🔐 Privacy & Security

- **Local Storage**: Data persists in browser only
- **No Backend**: All processing happens client-side
- **Camera/Mic**: Used only when explicitly enabled
- **AI Processing**: Uses secure APIs with no data retention

## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Run tests and accessibility checks
4. Submit pull request with description

## 📄 License

This project is open source. See LICENSE file for details.

## 🆘 Support

For issues, questions, or accessibility concerns:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Test in different browsers
4. Ensure camera/microphone permissions are granted

---

**Note**: This is a demonstration application. The AI-generated complaint content is for informational purposes only and does not constitute legal advice.