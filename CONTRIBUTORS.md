# Contributing to AccessAssist

Thank you for your interest in making AccessAssist better! This project is committed to accessibility-first development and inclusive design.

## 🎯 Project Mission

AccessAssist makes complaint processes accessible to everyone, including people with disabilities. Every contribution should align with this mission of inclusion and accessibility.

## 🚀 Getting Started

### Development Setup
```bash
# Fork the repository on GitHub
git clone https://github.com/your-username/accessassist.git
cd accessassist

# Install dependencies
npm install

# Start development server
npm run dev
```

### Before You Code
1. Read our [accessibility guidelines](#accessibility-guidelines)
2. Test with screen readers and keyboard navigation
3. Check existing issues and discussions
4. Consider opening an issue to discuss major changes

## 🔍 How to Contribute

### 1. Bug Reports
- Use GitHub Issues with the "bug" label
- Include steps to reproduce
- Mention browser, OS, and assistive technology used
- Include accessibility testing results if relevant

### 2. Feature Requests
- Use GitHub Issues with the "enhancement" label
- Explain the accessibility need or user pain point
- Consider how it affects different disability communities
- Provide use cases and examples

### 3. Code Contributions
- Fork the repo and create a feature branch
- Follow our [coding standards](#coding-standards)
- Test thoroughly with assistive technologies
- Submit a pull request with detailed description

### 4. Documentation
- Improve setup instructions
- Add accessibility testing guides
- Update API documentation
- Translate content (when internationalization is added)

### 5. Accessibility Testing
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify keyboard navigation
- Check color contrast ratios
- Test with voice input
- Validate sign language recognition

## 📋 Development Guidelines

### Accessibility Guidelines

#### WCAG 2.2 AA Compliance
- **Perceivable**: Text alternatives, captions, color contrast
- **Operable**: Keyboard accessible, no seizures, time limits
- **Understandable**: Readable, predictable, input assistance
- **Robust**: Compatible with assistive technologies

#### Code Requirements
- All interactive elements must be keyboard accessible
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large
- Semantic HTML with proper ARIA labels
- Screen reader friendly component names and descriptions
- Support for reduced motion preferences

### Coding Standards

#### TypeScript
- Use strict TypeScript configuration
- Define proper interfaces for all props
- Avoid `any` types - use specific types or `unknown`
- Document complex functions with JSDoc comments

#### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Handle loading and error states accessibly
- Include `aria-label` and `aria-describedby` where needed

#### CSS & Styling
- Use Tailwind utility classes consistently
- Follow the established design system
- Test responsive design on all screen sizes
- Ensure touch targets are ≥ 44px

#### Accessibility Implementation
```typescript
// ✅ Good - accessible button
<Button
  onClick={handleSubmit}
  aria-label="Submit complaint to company"
  disabled={isLoading}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>

// ❌ Bad - missing accessibility features
<div onClick={handleSubmit}>Submit</div>
```

#### Voice Input Support
```typescript
// ✅ Good - voice input ready
<Textarea
  value={input}
  onChange={setInput}
  placeholder="Describe your issue (voice input available)"
  aria-label="Issue description"
/>
<VoiceInputButton onResult={setInput} />

// ❌ Bad - no voice alternative
<textarea onChange={setInput} />
```

#### Sign Language Integration
- Ensure camera permissions are handled gracefully
- Provide fallback text input methods
- Display clear error messages for camera issues
- Support both gesture recognition and manual text input

### Testing Requirements

#### Before Submitting PR
- [ ] All TypeScript errors resolved
- [ ] ESLint passes with no warnings
- [ ] Components render without console errors
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all important changes
- [ ] Color contrast meets WCAG AA standards
- [ ] Voice input works on supported elements
- [ ] Camera/sign language features handle permissions properly

#### Manual Testing Checklist
- [ ] Tab through entire interface
- [ ] Test with screen reader (NVDA recommended)
- [ ] Verify high contrast mode works
- [ ] Check reduced motion setting
- [ ] Test voice input functionality
- [ ] Verify sign language detection (if applicable)
- [ ] Test on mobile devices
- [ ] Check with keyboard-only navigation

#### Browser Testing
- Chrome/Edge (primary)
- Firefox
- Safari (macOS/iOS)
- Mobile browsers

## 🧪 Testing Tools

### Automated Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build check
npm run build
```

### Accessibility Testing Tools
- **axe DevTools**: Browser extension for automated testing
- **Lighthouse**: Built into Chrome DevTools
- **WAVE**: Web accessibility evaluation tool
- **Color Contrast Analyzer**: For manual contrast checking

### Screen Reader Testing
- **NVDA** (Windows, free): https://www.nvaccess.org/
- **JAWS** (Windows, trial available): https://www.freedomscientific.com/
- **VoiceOver** (macOS/iOS, built-in): Cmd+F5
- **TalkBack** (Android, built-in): Settings > Accessibility

## 📝 Pull Request Process

### 1. Preparation
- Create feature branch: `git checkout -b feature/accessibility-improvement`
- Write clear, accessible code following our guidelines
- Test thoroughly with assistive technologies
- Update documentation as needed

### 2. PR Description Template
```markdown
## Changes Made
- Brief description of changes
- Accessibility improvements included

## Testing Completed
- [ ] Keyboard navigation
- [ ] Screen reader compatibility (specify which)
- [ ] Color contrast verification
- [ ] Voice input (if applicable)
- [ ] Mobile responsiveness

## WCAG Impact
- Which WCAG guidelines does this address?
- Any potential accessibility regressions?

## Screenshots/Videos
- Include before/after if UI changes
- Screen reader testing video (if major changes)
```

### 3. Review Process
- Maintainers will review for code quality and accessibility
- Accessibility testing by reviewers
- Address feedback promptly
- Final approval required from accessibility specialist

## 🏆 Recognition

Contributors who significantly improve accessibility will be:
- Listed in our CONTRIBUTORS.md file
- Mentioned in release notes
- Invited to join our accessibility advisory group

## 📚 Resources

### Accessibility Learning
- [WebAIM Guidelines](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)

### Sign Language & Voice Input
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
- [UK Sign Language Resources](https://www.british-sign.co.uk/)

### Testing Resources
- [Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey9/)
- [Keyboard Testing Guide](https://webaim.org/articles/keyboard/)
- [Color Contrast Tools](https://webaim.org/resources/contrastchecker/)

## 🤝 Code of Conduct

We are committed to providing a welcoming environment for all contributors, especially those from disability communities. Please:

- Use inclusive language
- Respect different perspectives and experiences
- Focus on accessibility and user needs
- Provide constructive feedback
- Help newcomers learn accessibility best practices

## 📧 Questions?

- Open a GitHub Discussion for general questions
- Use Issues for specific bugs or feature requests
- Tag maintainers for accessibility-specific questions

Together, we can make complaint processes accessible for everyone! 🌟