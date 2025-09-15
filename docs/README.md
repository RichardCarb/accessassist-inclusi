# AccessAssist Inclusi Documentation

Welcome to the comprehensive documentation for AccessAssist Inclusi - an accessibility-first AI assistant for filing complaints.

## 📚 Documentation Structure

### 👤 User Documentation
For people using AccessAssist to file complaints:

- **[Getting Started Guide](user-guide/getting-started.md)** - Complete guide for new users
- **[Accessibility Features](user-guide/accessibility-features.md)** - Overview of accessibility features *(coming soon)*
- **[Troubleshooting](user-guide/troubleshooting.md)** - Common issues and solutions *(coming soon)*
- **[Privacy & Security](user-guide/privacy-security.md)** - How we protect your data *(coming soon)*

### 🔧 Developer Documentation
For developers contributing to AccessAssist:

- **[Development Setup](../DEVELOPMENT.md)** - Local development environment setup
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute to the project
- **[API Reference](technical/api-reference.md)** - Internal APIs and component interfaces
- **[Sign Language Recognition](technical/sign-language-recognition.md)** - Technical implementation details
- **[Architecture Overview](technical/architecture.md)** - System architecture *(coming soon)*

### ♿ Accessibility Documentation
For accessibility experts and testers:

- **[Testing Guidelines](accessibility/testing-guidelines.md)** - Comprehensive accessibility testing procedures
- **[WCAG Compliance](accessibility/wcag-compliance.md)** - WCAG 2.2 AA compliance details *(coming soon)*
- **[Assistive Technology Support](accessibility/assistive-technology.md)** - Supported assistive technologies *(coming soon)*
- **[Accessibility Audit Reports](accessibility/audit-reports.md)** - Latest accessibility audit results *(coming soon)*

## 🎯 Quick Links

### For Users
- [🚀 Start Filing a Complaint](user-guide/getting-started.md#quick-start)
- [♿ Accessibility Features](user-guide/getting-started.md#accessibility-features)
- [🔒 Privacy Information](user-guide/getting-started.md#privacy--security)

### For Developers
- [⚡ Quick Setup](../DEVELOPMENT.md#initial-setup)
- [🧪 Testing Guide](../DEVELOPMENT.md#testing-strategy)
- [📝 Contribution Workflow](../CONTRIBUTING.md#development-workflow)

### For Accessibility Experts
- [🧪 Testing Checklist](accessibility/testing-guidelines.md#testing-checklist)
- [🛠️ Testing Tools](accessibility/testing-guidelines.md#testing-tools)
- [📊 Compliance Status](accessibility/testing-guidelines.md#wcag-guidelines)

## 🌟 Key Features

AccessAssist Inclusi supports three main input modalities:

- **🎤 Voice Recognition** - Natural speech-to-text with accessibility optimizations
- **⌨️ Text Input** - Full keyboard accessibility with screen reader support
- **✋ Sign Language** - Real-time British Sign Language recognition using AI

## 🏗️ Architecture Overview

```
AccessAssist Inclusi
├── Frontend (React + TypeScript)
│   ├── Components (Accessible UI)
│   ├── Services (AI/ML Processing)
│   └── Utils (Accessibility Helpers)
├── AI/ML Stack
│   ├── MediaPipe (Hand Detection)
│   ├── TensorFlow.js (Sign Recognition)
│   └── Custom Models (Complaint Drafting)
└── Documentation
    ├── User Guides
    ├── Technical Docs
    └── Accessibility Guidelines
```

## 🚀 Getting Started

### For Users
1. Open AccessAssist in your browser
2. Choose your preferred input method (voice, text, or sign language)
3. Follow the guided workflow to file your complaint
4. Export in your preferred format

### For Developers
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Read the [Development Guide](../DEVELOPMENT.md)

### For Contributors
1. Read our [Code of Conduct](../CODE_OF_CONDUCT.md)
2. Check the [Contributing Guidelines](../CONTRIBUTING.md)
3. Look for ["good first issue" labels](https://github.com/RichardCarb/accessassist-inclusi/labels/good%20first%20issue)
4. Join our community discussions

## 🤝 Community

AccessAssist is built by and for the accessibility community:

- **GitHub Discussions** - Ask questions and share ideas
- **Issue Tracker** - Report bugs and request features
- **Pull Requests** - Contribute code and documentation
- **Accessibility Testing** - Help us stay compliant and usable

## 📞 Support

### For Users
- Check the [Troubleshooting Guide](user-guide/troubleshooting.md) *(coming soon)*
- Open an issue for accessibility barriers
- Try alternative input methods if one isn't working

### For Developers
- Read the [Development Guide](../DEVELOPMENT.md)
- Check existing issues before creating new ones
- Use the appropriate issue templates

### For Accessibility Issues
- Use our [Accessibility Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include details about your assistive technology
- Describe the impact on your workflow

## 🔄 Documentation Updates

This documentation is continuously updated. Key update triggers:

- New features added to the application
- Changes to accessibility compliance
- User feedback and common questions
- Technical architecture changes
- Testing procedures updates

## 📄 License and Attribution

AccessAssist Inclusi is open source under the MIT License. See [LICENSE](../LICENSE) for details.

### Acknowledgments
- MediaPipe team for hand landmark detection
- TensorFlow.js team for browser-based ML
- The accessibility community for guidance and feedback
- British Sign Language research community

---

**Need help with something not covered here?** Open an issue on GitHub or check our community discussions. We're here to help make complaint filing accessible for everyone! 🌟