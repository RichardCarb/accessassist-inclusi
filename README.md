# AccessAssist Inclusi 🌟

**Accessibility-first AI assistant for filing complaints with voice, text, and sign language support**

AccessAssist Inclusi is an inclusive web application that empowers users with disabilities to draft, submit, and track complaints to companies using multiple input modalities. Built with accessibility at its core, the app supports voice input, text input, and real-time sign language recognition.

## 🎯 Mission

Making complaint filing accessible to everyone, regardless of ability or preferred communication method. We believe that everyone deserves to have their voice heard and their rights protected.

## ✨ Features

### 🎤 **Multimodal Input**
- **Voice Recognition**: Natural speech-to-text with accessibility optimizations
- **Text Input**: Keyboard-friendly with screen reader support  
- **Sign Language Recognition**: Real-time BSL recognition using MediaPipe and TensorFlow.js

### 🤖 **AI-Powered Assistance**
- Rights-aware complaint drafting with legal reference integration
- Plain language generation (Grade 8 readability)
- Structured complaint templates with guided prompts
- Context-aware suggestions and improvements

### ♿ **Accessibility First**
- WCAG 2.2 AA compliant interface
- High contrast mode with customizable themes
- Screen reader optimized with proper ARIA labels
- Keyboard navigation throughout
- Reduced motion respect for vestibular disorders
- Adjustable text size and spacing

### 📤 **Flexible Export**
- Email integration with accessible formatting
- Web form copy-paste ready text
- PDF generation with accessibility tags
- Multiple format options for different submission requirements

### 📊 **Progress Tracking**  
- Complaint status monitoring with deadline alerts
- Escalation guidance and timeline recommendations
- Visual and audio progress indicators
- Accessible status updates and notifications

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS with accessibility extensions
- **AI/ML**: TensorFlow.js for sign language recognition
- **Computer Vision**: MediaPipe for hand landmark detection
- **Build Tool**: Vite with optimized bundling
- **UI Components**: Radix UI primitives for accessibility
- **Icons**: Phosphor Icons with semantic labels

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Modern browser with WebRTC support (Chrome 88+, Firefox 85+, Safari 14+)
- HTTPS environment for camera access (required for sign language features)

### Installation

```bash
# Clone the repository
git clone https://github.com/RichardCarb/accessassist-inclusi.git
cd accessassist-inclusi

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `https://localhost:5173` (HTTPS required for camera access).

### Building for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

## 📚 Documentation

- **[Product Requirements](PRD.md)** - Detailed project specifications and user experience design
- **[Sign Language Recognition](src/docs/sign-language-recognition.md)** - Technical implementation details
- **[Development Guide](DEVELOPMENT.md)** - Local development setup and workflows
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project

## 🤝 Contributing

We welcome contributions from developers, accessibility experts, and community members! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

### Key Areas for Contribution
- Sign language vocabulary expansion
- Accessibility testing and improvements  
- UI/UX enhancements for different disabilities
- Performance optimizations
- Documentation improvements

## 🔒 Privacy & Security

- **Client-side Processing**: All AI processing happens in your browser
- **No Data Upload**: Video and audio never leave your device
- **Secure Contexts**: HTTPS required for sensitive features
- **User Consent**: Explicit permissions for camera and microphone access

## 🌐 Browser Support

| Browser | Version | Sign Language | Voice Input | Accessibility |
|---------|---------|---------------|-------------|---------------|
| Chrome  | 88+     | ✅ Full       | ✅ Full     | ✅ Full       |
| Firefox | 85+     | ✅ Full       | ✅ Full     | ✅ Full       |
| Safari  | 14+     | ⚠️ Limited    | ✅ Full     | ✅ Full       |
| Edge    | 88+     | ✅ Full       | ✅ Full     | ✅ Full       |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- MediaPipe team for hand landmark detection
- TensorFlow.js team for browser-based ML
- The accessibility community for guidance and feedback
- British Sign Language research community

---

**Built with ❤️ for accessibility and inclusion**