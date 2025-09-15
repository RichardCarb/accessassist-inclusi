# AccessAssist - Inclusive AI for Complaints

**ALWAYS follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

AccessAssist is a React 19/TypeScript web application built with Vite that helps users create professional complaint letters with AI assistance. The application prioritizes accessibility with multi-modal input including voice, text, and real-time UK Sign Language recognition using MediaPipe and TensorFlow.js.

## Working Effectively

### Environment Setup & Bootstrap
Pre-requisites are already installed: Node.js v20.19.5 and npm 10.8.2.

**CRITICAL: Always run these commands from the repository root: `/home/runner/work/accessassist-inclusi/accessassist-inclusi`**

- Install dependencies: `npm install` -- takes 45 seconds to complete. NEVER CANCEL.
- Build the application: `npm run build` -- takes 9 seconds to complete. NEVER CANCEL. Set timeout to 20+ seconds.
- Lint the code: `npm run lint` -- takes 2 seconds. Linting currently has 39 errors and 10 warnings but does NOT block the build.
- Start development server: `npm run dev` -- starts in ~1 second, runs on http://localhost:5000
- Preview production build: `npm run preview` -- runs on http://localhost:4173
- Optimize dependencies: `npm run optimize` -- takes <1 second (deprecated command, use if needed)

### Validation & Testing

**MANUAL VALIDATION REQUIREMENT**: After making any changes to the application, ALWAYS test the following user scenarios:

1. **Basic Application Load**: Navigate to http://localhost:5000 and verify the homepage loads correctly
2. **Accessibility Controls**: Click "Settings" button and verify the accessibility dialog opens with High Contrast, Text Size, Reduced Motion, and Voice Controls options
3. **Complaint Creation Flow**: Click "Create Complaint" button and verify the multi-step form loads with text/voice and UK Sign Language tabs
4. **Camera Functionality Test**: Click "Test Camera" button (will show "No camera found" in testing environment - this is expected)
5. **Navigation**: Verify all navigation between sections works properly

**Expected Behaviors**:
- Media API shows as available (✓) in debug information
- KV service errors are EXPECTED and do not affect functionality
- Icon proxy warnings about non-existent icons are EXPECTED (icons are replaced with "Question" icon)
- Application loads and functions correctly despite these warnings/errors

### Common Issues & Fixes

**ESLint Configuration**: 
- eslint.config.js is required for ESLint 9.0+ (already configured)
- Current code has linting issues (39 errors, 10 warnings) but builds successfully
- Run `npm run lint` to see current issues but DO NOT let linting errors block development

**TailwindCSS Spacing Issue**:
- CRITICAL: After fresh `npm install`, TailwindCSS 4.x may have spacing function conflicts
- If build fails with "The --spacing(…) function requires that the `--spacing` theme variable exists":
  - Add `--spacing: var(--size-4);` to the `@theme inline` block in `src/main.css`
  - This is already fixed in the current codebase

**Build Dependencies**:
- The app uses GitHub Spark plugins which require specific Vite configuration
- Icon proxy automatically replaces missing Phosphor icons with fallbacks
- TailwindCSS 4.x is configured with custom theme support

## Architecture & Key Technologies

### Frontend Stack
- **React 19** with TypeScript and Vite 6.3.5
- **UI Framework**: Tailwind CSS 4.1.11, Radix UI components, GitHub Spark design system
- **AI/ML**: TensorFlow.js 4.22.0, MediaPipe Hands 0.4.x for real-time sign language recognition
- **State Management**: React hooks, GitHub Spark KV (may show errors in local development)
- **Build Tool**: Vite with custom GitHub Spark plugins

### Key Features
- **Multi-Modal Input**: Text, voice recognition (Web Speech API), and real-time UK Sign Language recognition
- **Accessibility First**: WCAG 2.2 AA compliant, screen reader support, keyboard navigation
- **AI-Powered Drafting**: Creates professional complaint letters using consumer rights information
- **Export Options**: Email, web forms, accessible PDF/document downloads
- **Progress Tracking**: Monitors complaint status with escalation guidance

### Code Organization
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (Radix UI + custom)
│   ├── AccessibilityControls.tsx    # Accessibility settings dialog
│   ├── CameraTest.tsx              # Camera/MediaPipe testing
│   ├── ComplaintIntake.tsx         # Multi-step complaint form
│   ├── ComplaintDrafter.tsx        # AI drafting interface
│   ├── ComplaintTracker.tsx        # Progress tracking
│   ├── SignLanguageRecorder.tsx    # Sign language input
│   └── HandTrackingCamera.tsx      # MediaPipe hand tracking
├── data/               # Static data and configurations
│   └── ombudsman-database.ts       # Ombudsman service information
├── docs/               # Technical documentation
│   └── sign-language-recognition.md # Implementation details
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── styles/             # CSS and theme files
```

## Development Guidelines

### Making Changes
- **ALWAYS** test accessibility features after UI changes
- **ALWAYS** verify multi-modal input functionality (text/voice/sign language tabs)
- **NEVER** remove accessibility features or ARIA labels
- **NEVER** break keyboard navigation
- Check browser console for new errors (KV and icon proxy warnings are expected)

### Code Quality
- Run `npm run lint` before committing (warnings/errors are currently expected)
- Follow existing TypeScript patterns and component structure
- Maintain WCAG 2.2 AA compliance standards
- Use semantic HTML and proper ARIA labels

### Performance Considerations
- MediaPipe and TensorFlow.js are loaded for sign language recognition
- Large bundle size (~499KB JS, ~349KB CSS) due to AI libraries
- Real-time processing requires modern browsers (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)

## Browser Requirements & Compatibility

### Supported Browsers
- **Chrome 88+** (recommended for MediaPipe)
- **Firefox 85+**
- **Safari 14+**
- **Edge 88+**

### Required Features
- WebRTC support for camera access
- WebAssembly support for MediaPipe
- Modern JavaScript (ES2020+)
- HTTPS required for camera access in production

## Troubleshooting

### Build Issues
- If `npm install` fails: Clear node_modules and package-lock.json, then reinstall
- If build fails: Check for TypeScript errors with `tsc --noEmit`
- If dev server won't start: Check port 5000 availability with `fuser -k 5000/tcp`

### Runtime Issues
- **KV Service Errors**: Expected in local development, does not affect functionality
- **Camera Access**: Requires HTTPS in production, may not work in all testing environments
- **Icon Warnings**: Automatically handled by icon proxy, does not affect functionality
- **Sign Language Recognition**: Requires camera permissions and good lighting

### Common Error Messages (Expected)
- "Failed to fetch KV key: Forbidden" - Expected, KV service not available locally
- "Proxying non-existent icon" - Expected, icons are replaced with fallbacks
- "Camera test failed: NotFoundError" - Expected in testing environments without cameras

## Important Files & Locations

### Configuration Files
- `vite.config.ts` - Vite configuration with Spark plugins
- `tailwind.config.js` - TailwindCSS 4.x configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint 9.x configuration (created for compatibility)
- `package.json` - Dependencies and scripts

### Documentation
- `README.md` - Basic project overview
- `PRD.md` - Product Requirements Document
- `src/docs/sign-language-recognition.md` - Technical implementation details
- `SECURITY.md` - Security policy

### Entry Points
- `index.html` - HTML entry point
- `src/main.tsx` - React application entry
- `src/App.tsx` - Main application component

## Time Expectations & Timeouts

**CRITICAL: NEVER CANCEL builds or long-running commands**

- **npm install**: 60 seconds - NEVER CANCEL. Set timeout to 180+ seconds
- **npm run build**: 9 seconds - NEVER CANCEL. Set timeout to 30+ seconds  
- **npm run dev**: 1 second startup, runs indefinitely
- **npm run lint**: 2 seconds
- **npm run preview**: 1 second startup, runs indefinitely

Always wait for commands to complete naturally. If a command appears to hang, wait at least 60 seconds before considering alternatives.