# Changelog

All notable changes to AccessAssist Inclusi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project-specific README with comprehensive documentation
- Contributing guidelines for developers and accessibility experts
- Code of Conduct emphasizing accessibility and inclusion
- GitHub issue templates for bug reports and feature requests
- Pull request template with accessibility checklist
- Development guide with local setup instructions
- Documentation structure in `docs/` folder
- Changelog for tracking releases and improvements

### Changed
- Updated package.json with proper project metadata
- Replaced generic Spark Template README with project-specific content
- Organized technical documentation into structured folder

### Documentation
- Moved sign language recognition docs to `docs/technical/`
- Created placeholder for user guides and accessibility documentation
- Added browser compatibility matrix
- Included accessibility testing guidelines

## [1.0.0] - 2024-XX-XX

### Added
- Multimodal complaint intake system (voice, text, sign language)
- Real-time sign language recognition using MediaPipe and TensorFlow.js
- AI-powered complaint drafting with rights-aware suggestions
- WCAG 2.2 AA compliant user interface
- Flexible export options (email, web forms, accessible PDF)
- Progress tracking and escalation guidance
- High contrast mode and customizable accessibility settings
- Screen reader optimization with proper ARIA implementation
- Keyboard navigation throughout the application
- Voice recognition with accessibility optimizations

### Technical
- React 19 with TypeScript foundation
- Vite build system with optimized bundling
- Tailwind CSS with accessibility extensions
- Radix UI component primitives for accessibility
- MediaPipe integration for hand landmark detection
- TensorFlow.js for browser-based machine learning
- Comprehensive browser support (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)

### Accessibility
- Full keyboard navigation support
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- High contrast mode support
- Reduced motion preferences respected
- Minimum 4.5:1 color contrast ratios
- Focus indicators on all interactive elements
- Descriptive error messages and form validation
- Alternative text for all images and icons

---

## Version History Legend

- **Added** for new features
- **Changed** for changes in existing functionality  
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
- **Accessibility** for accessibility improvements
- **Performance** for performance improvements