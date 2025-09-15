# API Reference

This document outlines the internal APIs and components used in AccessAssist Inclusi. This is primarily for developers contributing to the project.

## 🏗️ Core Components API

### ComplaintIntake Component

The main component for collecting complaint information from users.

```typescript
interface ComplaintIntakeProps {
  onComplaintComplete: (complaint: ComplaintData) => void;
  initialData?: Partial<ComplaintData>;
  mode?: 'voice' | 'text' | 'sign-language';
}

interface ComplaintData {
  company: CompanyInfo;
  issue: IssueDetails;
  evidence: EvidenceItem[];
  userInfo: UserInfo;
  timestamp: Date;
}
```

### Sign Language Recognition API

```typescript
interface SignLanguageRecognitionProps {
  onTextGenerated: (text: string, confidence: number) => void;
  onError: (error: Error) => void;
  vocabulary?: SignPattern[];
  confidenceThreshold?: number;
}

interface SignPattern {
  id: string;
  name: string;
  landmarks: HandLandmark[];
  confidence: number;
}
```

### Voice Recognition API

```typescript
interface VoiceRecognitionProps {
  onTranscription: (text: string) => void;
  onError: (error: Error) => void;
  language?: string;
  continuous?: boolean;
}
```

## 🧠 AI Services API

### Complaint Drafter

```typescript
interface ComplaintDrafterService {
  generateDraft(data: ComplaintData): Promise<DraftResult>;
  improveDraft(draft: string, feedback: string): Promise<DraftResult>;
  checkCompliance(draft: string): Promise<ComplianceResult>;
}

interface DraftResult {
  text: string;
  readabilityGrade: number;
  legalReferences: string[];
  suggestions: string[];
}
```

### Rights Knowledge Base

```typescript
interface RightsKnowledgeBase {
  getRelevantRights(category: string, jurisdiction: string): Promise<Right[]>;
  getEscalationPath(company: string, issueType: string): Promise<EscalationStep[]>;
  getTemplatePhrase(context: string): Promise<string>;
}
```

## 🔧 Utility APIs

### Accessibility Utils

```typescript
interface AccessibilityUtils {
  announceToScreenReader(message: string, priority?: 'polite' | 'assertive'): void;
  manageFocus(element: HTMLElement): void;
  checkColorContrast(foreground: string, background: string): number;
  generateAriaLabel(context: ComponentContext): string;
}
```

### Export Services

```typescript
interface ExportService {
  exportToEmail(complaint: ComplaintData, format: EmailFormat): Promise<EmailData>;
  exportToPDF(complaint: ComplaintData, options: PDFOptions): Promise<Blob>;
  exportToText(complaint: ComplaintData): string;
}

interface EmailFormat {
  template: 'formal' | 'casual' | 'legal';
  includeAttachments: boolean;
  subject: string;
}
```

## 🎯 Event System

### Application Events

```typescript
type AppEvent = 
  | { type: 'complaint-started'; mode: InputMode }
  | { type: 'complaint-completed'; data: ComplaintData }
  | { type: 'accessibility-setting-changed'; setting: string; value: any }
  | { type: 'error-occurred'; error: Error; component: string };

interface EventBus {
  emit(event: AppEvent): void;
  subscribe(eventType: string, handler: (event: AppEvent) => void): () => void;
}
```

## 🔒 Security & Privacy APIs

### Privacy Manager

```typescript
interface PrivacyManager {
  clearUserData(): Promise<void>;
  getDataRetentionPolicy(): DataRetentionPolicy;
  exportUserData(): Promise<UserDataExport>;
  anonymizeData(data: any): any;
}
```

### Secure Storage

```typescript
interface SecureStorage {
  store(key: string, data: any, ttl?: number): Promise<void>;
  retrieve(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

## 🌐 Browser Compatibility APIs

### Feature Detection

```typescript
interface FeatureDetection {
  hasWebRTC(): boolean;
  hasWebSpeech(): boolean;
  hasMediaPipe(): boolean;
  hasTensorFlow(): boolean;
  getAccessibilityFeatures(): AccessibilityFeature[];
}

interface AccessibilityFeature {
  name: string;
  supported: boolean;
  fallback?: string;
}
```

## 📊 Analytics & Monitoring

### Usage Analytics

```typescript
interface UsageAnalytics {
  trackFeatureUsage(feature: string, context?: any): void;
  trackAccessibilityUsage(tool: string, success: boolean): void;
  trackPerformance(metric: string, value: number): void;
  trackError(error: Error, context: string): void;
}
```

### Performance Monitoring

```typescript
interface PerformanceMonitor {
  measureSignLanguageLatency(): Promise<number>;
  measureVoiceRecognitionAccuracy(): Promise<number>;
  measurePageLoadTime(): number;
  getMemoryUsage(): MemoryInfo;
}
```

## 🧪 Testing APIs

### Test Utilities

```typescript
interface TestUtils {
  mockSignLanguageRecognition(patterns: SignPattern[]): void;
  mockVoiceRecognition(transcript: string): void;
  simulateAccessibilityTool(tool: 'screen-reader' | 'voice-control'): void;
  generateComplaintData(overrides?: Partial<ComplaintData>): ComplaintData;
}
```

### Accessibility Test Helpers

```typescript
interface AccessibilityTestHelpers {
  checkKeyboardNavigation(container: HTMLElement): Promise<KeyboardTestResult>;
  checkScreenReaderAnnouncements(container: HTMLElement): Promise<string[]>;
  checkColorContrast(container: HTMLElement): Promise<ContrastResult>;
  checkFocusManagement(interactions: UserInteraction[]): Promise<FocusTestResult>;
}
```

## 📱 Mobile APIs

### Mobile-Specific Features

```typescript
interface MobileFeatures {
  detectDeviceOrientation(): 'portrait' | 'landscape';
  optimizeForTouchTargets(element: HTMLElement): void;
  handlePinchZoom(scale: number): void;
  adaptForScreenSize(size: ScreenSize): void;
}
```

## 🔄 State Management

### Application State

```typescript
interface AppState {
  user: UserState;
  complaint: ComplaintState;
  accessibility: AccessibilityState;
  ui: UIState;
}

interface StateManager {
  getState(): AppState;
  setState(partial: Partial<AppState>): void;
  subscribe(listener: (state: AppState) => void): () => void;
  persist(): Promise<void>;
  restore(): Promise<void>;
}
```

## 🌍 Internationalization

### i18n API

```typescript
interface I18nService {
  translate(key: string, params?: Record<string, any>): string;
  setLocale(locale: string): Promise<void>;
  getAvailableLocales(): string[];
  formatDate(date: Date, format: string): string;
  formatNumber(number: number, options?: Intl.NumberFormatOptions): string;
}
```

## 📚 Documentation

For detailed implementation examples and advanced usage patterns, see:

- [Sign Language Recognition Implementation](./sign-language-recognition.md)
- [Accessibility Implementation Guide](../accessibility/testing-guidelines.md)
- [Development Setup](../../DEVELOPMENT.md)

## 🤝 Contributing

When adding new APIs:

1. Follow TypeScript best practices
2. Include accessibility considerations
3. Add comprehensive JSDoc comments
4. Include usage examples
5. Update this documentation
6. Add tests for new functionality

For questions about the API or suggestions for improvements, please open an issue in the GitHub repository.