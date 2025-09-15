# Development Guide

This guide provides detailed instructions for setting up and developing AccessAssist Inclusi locally.

## 🏗️ Development Environment Setup

### Prerequisites

**Required:**
- **Node.js** 18.x or later ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Modern Browser** with WebRTC support:
  - Chrome 88+ (recommended for development)
  - Firefox 85+
  - Safari 14+
  - Edge 88+

**Recommended:**
- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - axe Accessibility Linter
  - Auto Rename Tag
  - Tailwind CSS IntelliSense

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RichardCarb/accessassist-inclusi.git
   cd accessassist-inclusi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `https://localhost:5173`
   
   ⚠️ **Important:** HTTPS is required for camera access (sign language features)

## 🛠️ Development Scripts

### Core Scripts
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally  
npm run preview

# Run linting
npm run lint

# Kill development server (if stuck)
npm run kill

# Optimize dependencies
npm run optimize
```

### Available URLs
- **Development**: `https://localhost:5173`
- **Preview**: `http://localhost:4173`

## 🏛️ Project Architecture

### Directory Structure
```
accessassist-inclusi/
├── .github/                  # GitHub templates and workflows
│   ├── ISSUE_TEMPLATE/      # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
├── src/                     # Source code
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   └── forms/         # Form-specific components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── data/              # Static data and configurations
│   ├── docs/              # Technical documentation
│   └── styles/            # Global styles and themes
├── public/                 # Static assets
├── docs/                  # Project documentation
└── dist/                  # Built application (generated)
```

### Key Technologies

**Frontend Framework:**
- React 19 with TypeScript
- Vite for build tooling and development server
- Tailwind CSS for styling

**AI/ML Stack:**
- TensorFlow.js for browser-based machine learning
- MediaPipe for hand landmark detection
- Custom gesture recognition algorithms

**Accessibility:**
- Radix UI for accessible component primitives
- Custom accessibility hooks and utilities
- WCAG 2.2 AA compliance tooling

## 🎨 Development Workflow

### 1. Creating New Features

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop with accessibility in mind:**
   - Test with keyboard navigation
   - Ensure screen reader compatibility
   - Maintain color contrast ratios
   - Add proper ARIA labels

3. **Test thoroughly:**
   ```bash
   npm run build    # Test production build
   npm run lint     # Check code quality
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: add descriptive commit message"
   git push origin feature/your-feature-name
   ```

### 2. Component Development

**Creating New Components:**
```typescript
// src/components/ui/MyComponent.tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface MyComponentProps {
  className?: string
  children: React.ReactNode
  // Always include accessibility props when relevant
  'aria-label'?: string
}

const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('base-styles', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

MyComponent.displayName = 'MyComponent'
export { MyComponent }
```

**Accessibility Guidelines:**
- Use semantic HTML elements
- Include proper ARIA attributes
- Support keyboard navigation
- Test with screen readers
- Ensure sufficient color contrast

### 3. Sign Language Recognition Development

**MediaPipe Setup:**
```typescript
import { Hands } from '@mediapipe/hands'

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
})

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
})
```

**Testing Sign Language Features:**
1. Ensure HTTPS is enabled (required for camera access)
2. Test with different lighting conditions
3. Verify hand landmark detection accuracy
4. Test gesture recognition confidence thresholds

## 🧪 Testing Strategy

### Manual Testing Checklist

**Accessibility Testing:**
- [ ] Keyboard navigation works throughout the app
- [ ] Screen reader announces content correctly
- [ ] High contrast mode is supported
- [ ] Page zoom up to 200% works properly
- [ ] Focus indicators are clearly visible
- [ ] Color-only information has text alternatives

**Cross-Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Assistive Technology Testing:**
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS/iOS)
- [ ] Dragon NaturallySpeaking (voice control)

### Automated Testing Tools

**Browser Extensions:**
- axe DevTools - Accessibility testing
- WAVE - Web accessibility evaluation
- Lighthouse - Performance and accessibility audits

**CLI Tools:**
```bash
# Run accessibility audits
npx @axe-core/cli http://localhost:5173

# Performance testing
npx lighthouse http://localhost:5173
```

## 🔧 Troubleshooting

### Common Issues

**Development Server Won't Start:**
```bash
# Kill any processes using port 5173
npm run kill
# Or manually:
lsof -ti:5173 | xargs kill -9

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Camera Access Issues:**
- Ensure you're using HTTPS (`https://localhost:5173`)
- Check browser permissions for camera access
- Try different browsers if issues persist
- Verify camera is not being used by other applications

**Build Errors:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm ci

# Check TypeScript errors
npx tsc --noEmit
```

### Performance Optimization

**Bundle Analysis:**
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist
```

**MediaPipe Optimization:**
- Use appropriate model complexity for target devices
- Implement frame throttling for lower-end devices
- Consider lazy loading for ML models

## 🔍 Code Quality

### ESLint Configuration
The project uses modern ESLint configuration. Rules focus on:
- TypeScript best practices
- React hooks compliance
- Accessibility standards
- Code consistency

### TypeScript Guidelines
- Use strict mode
- Prefer interfaces over types for object shapes
- Include proper JSDoc comments for complex functions
- Use proper generic constraints

### Styling Guidelines
- Use Tailwind CSS utilities
- Follow mobile-first responsive design
- Maintain 4.5:1 color contrast ratio minimum
- Use semantic spacing scale (4, 8, 16, 24px)

## 🚀 Deployment

### Production Build
```bash
# Create optimized production build
npm run build

# Test production build locally
npm run preview
```

### Environment Variables
Create `.env.local` for local development:
```bash
# Example environment variables
VITE_API_URL=https://api.example.com
VITE_ENABLE_ANALYTICS=false
```

## 📚 Additional Resources

### Learning Resources
- [React Accessibility Guide](https://reactjs.org/docs/accessibility.html)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [MediaPipe Documentation](https://google.github.io/mediapipe/)
- [TensorFlow.js Tutorials](https://www.tensorflow.org/js/tutorials)

### Community
- GitHub Discussions for questions and ideas
- Issues for bug reports and feature requests
- Pull requests for contributions

Happy coding! 🎉