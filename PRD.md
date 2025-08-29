# AccessAssist - Inclusive AI for Complaints

AccessAssist is an accessibility-first assistant that helps users draft, submit, and track complaints to companies with voice, text, and braille-ready interaction support.

**Experience Qualities**: 
1. Inclusive - Every interaction mode (voice, text, braille) feels natural and complete
2. Empowering - Users gain confidence through clear guidance and rights-aware information  
3. Efficient - Complex complaint processes simplified to under 3 minutes

**Complexity Level**: Light Application (multiple features with basic state)
The app handles complaint intake, drafting, export, and tracking with persistent state but remains focused on core accessibility features without advanced user management.

## Essential Features

### Multimodal Complaint Intake
- **Functionality**: Voice or text input for complaint details with guided prompts
- **Purpose**: Accommodates users with different accessibility needs and preferences
- **Trigger**: "Start Complaint" button or voice command "Start my complaint"
- **Progression**: Welcome → Company Selection → Issue Description → Evidence Collection → Impact Assessment → Remedy Request → Review → Submit
- **Success criteria**: Complete intake in under 3 minutes with all required fields captured

### Rights-Aware Complaint Drafting
- **Functionality**: AI-powered drafting using consumer rights knowledge base with plain language
- **Purpose**: Ensures complaints are structured, legally informed, and easy to understand
- **Trigger**: Completion of intake process
- **Progression**: Data Processing → Draft Generation → User Review → Edits/Approval → Final Draft
- **Success criteria**: Grade 8 readability, includes relevant legal references, 180-250 words

### Accessible Export Options
- **Functionality**: Export to email, web form text, or accessible PDF/document
- **Purpose**: Provides flexible submission methods based on company requirements
- **Trigger**: User approves final draft
- **Progression**: Export Selection → Format Generation → Copy/Download/Send → Confirmation
- **Success criteria**: All exports are accessibility-compliant and properly formatted

### Status Tracking & Escalation
- **Functionality**: Track complaint status with deadline monitoring and escalation guidance
- **Purpose**: Helps users follow up appropriately and escalate when needed
- **Trigger**: Successful export or manual status update
- **Progression**: Initial Submit → Company Response → Status Updates → Deadline Monitoring → Escalation Alerts
- **Success criteria**: Visual and screen reader accessible status updates with clear next steps

### Accessibility Controls
- **Functionality**: High contrast, text size, reduced motion, captions, voice controls
- **Purpose**: Ensures usability across different disability types and assistive technologies
- **Trigger**: Settings panel or voice commands
- **Progression**: Settings Access → Preference Selection → Real-time Application → Persistence
- **Success criteria**: WCAG 2.2 AA compliance, screen reader compatibility, keyboard navigation

## Edge Case Handling
- **Complex Evidence**: Guided prompts for missing information with examples
- **Company Not Found**: Manual entry with validation and suggestion system
- **Voice Recognition Errors**: Confirmation prompts and easy correction methods
- **Long Form Content**: Chunked reading for screen readers with navigation options
- **Network Issues**: Offline draft saving with sync when connection restored

## Design Direction
The design should feel professional yet approachable, like a knowledgeable advocate sitting beside you. Minimal interface that prioritizes content clarity and reduces cognitive load while maintaining visual hierarchy through purposeful contrast and spacing.

## Color Selection
Complementary (opposite colors) - High contrast blue and orange system to ensure accessibility compliance while providing clear visual distinction between interactive and informational elements.

- **Primary Color**: Deep Blue `oklch(0.35 0.15 250)` - Conveys trust and professionalism for complaint advocacy
- **Secondary Colors**: Neutral Gray `oklch(0.65 0.02 250)` for supportive text and Medium Blue `oklch(0.55 0.12 250)` for secondary actions
- **Accent Color**: Warm Orange `oklch(0.65 0.18 45)` for important calls-to-action and progress indicators
- **Foreground/Background Pairings**: 
  - Background (White `oklch(1 0 0)`): Dark Blue text `oklch(0.25 0.15 250)` - Ratio 8.2:1 ✓
  - Card (Light Gray `oklch(0.98 0.01 250)`): Dark Blue text `oklch(0.25 0.15 250)` - Ratio 7.8:1 ✓
  - Primary (Deep Blue `oklch(0.35 0.15 250)`): White text `oklch(1 0 0)` - Ratio 8.2:1 ✓
  - Secondary (Medium Blue `oklch(0.55 0.12 250)`): White text `oklch(1 0 0)` - Ratio 4.8:1 ✓
  - Accent (Warm Orange `oklch(0.65 0.18 45)`): White text `oklch(1 0 0)` - Ratio 4.9:1 ✓
  - Muted (Light Gray `oklch(0.95 0.01 250)`): Dark Gray text `oklch(0.35 0.02 250)` - Ratio 6.1:1 ✓

## Font Selection
Clear, highly legible sans-serif that performs well with screen readers and supports international accessibility standards - Inter for its excellent screen rendering and wide character support.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing  
  - H3 (Step Titles): Inter Medium/18px/normal spacing
  - Body (Main Content): Inter Regular/16px/relaxed line height (1.6)
  - Small (Helper Text): Inter Regular/14px/relaxed line height

## Animations
Minimal, purposeful motion that supports accessibility - smooth transitions for state changes with respect for reduced motion preferences and clear progress indicators.

- **Purposeful Meaning**: Gentle fade transitions communicate state changes while respecting cognitive processing needs
- **Hierarchy of Movement**: Progress indicators and status changes get subtle motion priority, decorative animations disabled in reduced motion mode

## Component Selection
- **Components**: Cards for complaint sections, Forms for input collection, Dialogs for confirmations, Buttons with clear focus states, Progress indicators for multi-step flows, Alerts for status updates
- **Customizations**: Enhanced Button component with voice activation feedback, Custom Progress component with screen reader announcements, Specialized VoiceInput component
- **States**: All interactive elements have distinct hover/focus/active/disabled states with high contrast focus rings and clear visual feedback
- **Icon Selection**: Phosphor icons with descriptive labels - Plus for add actions, CheckCircle for completion, Warning for alerts, Speaker for voice controls
- **Spacing**: Consistent 4/8/16/24px spacing scale for comfortable touch targets and visual breathing room
- **Mobile**: Mobile-first responsive design with larger touch targets (48px minimum), collapsible navigation, and optimized voice input controls