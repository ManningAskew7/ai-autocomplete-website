# AI Autocomplete Browser Extension

## 🚀 Overview

AI Autocomplete is a powerful browser extension that brings intelligent text completion to any web page with a privacy-first design and comprehensive consent system. Using advanced detection methods and a smart cascade system, it works on 85%+ of websites without any configuration, with an optional fallback mode that extends support to 95%+ of all sites including canvas-based editors like Google Docs. 

The extension now features a complete privacy consent flow that appears on first installation, ensuring full compliance with GDPR and CCPA regulations while providing users with transparent control over their data.

### Key Features
- **Privacy-First Design**: Comprehensive consent flow with GDPR/CCPA compliance built-in
- **Smart Cascade Detection**: Multiple extraction methods ensure maximum compatibility
- **Three Completion Modes**: Short (5-20 words), Medium (20-40 words), Long (50-100 words)
- **AI Text Rewriting**: Select text and rewrite it with 3 different AI-generated options using Alt+Shift+R
- **User Consent System**: Full-screen consent interface appears on first installation
- **Professional UI Design**: Black and white theme with SVG icons (no emojis)
- **Loading Feedback**: Visual cursor feedback when processing AI requests
- **Mode Cycling**: Quick keyboard shortcut (Shift+Alt+M) to switch between completion modes
- **Mode Indicator**: Visual indicator in top-right corner showing current mode
- **Customizable Keybinds**: Full control over keyboard shortcuts to match your workflow
- **Multi-Suggestion System**: Generates 5 unique AI completions you can cycle through
- **Structured Outputs Support**: Automatic detection of models that support JSON Schema for guaranteed valid responses
- **Universal Numbered List Format**: Reliable numbered list prompts (1-5) for models without structured output support
- **Advanced Model Compatibility**: Intelligent handling of reasoning models (GPT-5, Gemini 2.5, etc.) with proper fallback chains
- **Streamlined Model Selection**: Browse and search ALL 100+ OpenRouter models with instant filtering
- **Enhanced Text Insertion**: Improved reliability with verification and fallback methods
- **Editor Support**: Native support for CodeMirror, Monaco, Ace, Quill, TinyMCE, CKEditor
- **Enhanced Text Extraction**: Captures paste events, voice input, and autocomplete
- **Data Protection**: Text only processed when explicitly triggered, never stored permanently
- **Real-time Detection**: Monitors dynamically added elements and field changes
- **Optimized UI**: Fixed 520px popup height with space-efficient layout
- **Extension Icons**: Professional "AIAC" logo with arrow design for all sizes
- **Canvas Site Support**: Works on Google Docs and similar sites with intelligent limitation notices

### How It Works

#### Autocomplete Feature
1. **First Installation**: Consent screen appears automatically with privacy information and agreement options
2. **Setup**: After consenting, configure your OpenRouter API key in the popup interface
3. **Choose Your Mode**: Select Short/Medium/Long completion mode in popup or press **Shift+Alt+M** to cycle
4. **Trigger Completion**: Press **Ctrl+Space** (customizable) - cursor shows loading state
5. **Browse Options**: Use **Tab** (customizable) to cycle through 5 different completion options
6. **Accept Suggestion**: Press **→ Right Arrow** (customizable) to accept the current suggestion
7. **Dismiss**: Press **Esc** (customizable) to cancel suggestions

#### Rewrite Feature
1. **Select Text**: Highlight any text you want to improve or rewrite
2. **Trigger Rewrite**: Press **Alt+Shift+R** (customizable) to generate rewrite options
3. **Browse Rewrites**: Use **Tab** to cycle through 3 different rewrite variations
4. **Accept Rewrite**: Press **→ Right Arrow** to replace the selected text
5. **Dismiss**: Press **Esc** to cancel without making changes
6. **Canvas Sites**: On Google Docs and similar sites, copy text first as a workaround
7. **Fixed UI Timeout**: Rewrite UI now stays visible for full 60 seconds without premature disappearing
8. **Intelligent Variations**: Single rewrite responses now generate 3 contextually different variations instead of duplicates
9. **Same Reliability**: Uses the same structured output and numbered list system as autocomplete

## 📁 Project Structure

```
ai-autocomplete-ext/
├── dist/                    # Production build output
│   ├── manifest.json       # Chrome extension manifest
│   ├── content.js          # Compiled content script
│   ├── background.js       # Compiled service worker
│   ├── icon-16.png         # Extension icon (16x16)
│   ├── icon-48.png         # Extension icon (48x48)
│   ├── icon-128.png        # Extension icon (128x128)
│   └── src/                # Compiled assets
│       ├── popup/          # Popup HTML and assets
│       └── consent/        # Consent page HTML and assets
├── public/
│   ├── manifest.json       # Source manifest file
│   ├── icon-16.png         # Extension icons (all sizes)
│   ├── icon-48.png         # Professional AIAC logo design
│   ├── icon-128.png        # (auto-copied to dist during build)
│   └── store-icon-128.png  # Chrome Web Store icon
├── src/
│   ├── background/
│   │   ├── index.ts        # Service worker (API calls, consent checks)
│   │   └── prompts.ts       # Completion mode prompts and configuration
│   ├── components/
│   │   ├── ConsentScreen.tsx     # Privacy consent UI component
│   │   └── ConsentScreen.css     # Black/white consent screen styling
│   ├── consent/
│   │   ├── consent.html    # Consent page HTML entry point
│   │   └── main.tsx        # Consent page React entry point
│   ├── content/
│   │   ├── index.ts        # Main content script (with consent checking)
│   │   ├── content-logger.ts # Standalone logger for content scripts
│   │   └── universal-detector.ts  # Text input detection module
│   ├── popup/
│   │   ├── Popup.tsx       # Settings interface with mode selection
│   │   ├── styles.css      # Popup styling
│   │   └── main.tsx        # Popup entry point
│   └── utils/
│       ├── logger.ts       # Development logging system
│       ├── premium.ts      # Premium features management
│       └── privacy.ts      # Privacy consent and data management
├── PRIVACY_POLICY.md       # Comprehensive privacy policy
├── TERMS_OF_SERVICE.md     # Terms of service document
├── vite.config.ts          # Build configuration (includes consent page)
└── package.json            # Project dependencies
```

## 🤖 Model Compatibility

The extension intelligently handles different AI models with advanced compatibility features:

### Structured Outputs Support
- **Automatic Detection**: Extension checks OpenRouter API to identify models supporting JSON Schema
- **Guaranteed Valid JSON**: Models with structured output support return perfectly formatted responses
- **Compatible Models**: GPT-4, Claude-3.5-Sonnet, and other advanced models that support `response_format`
- **JSON Schema Enforcement**: Uses strict JSON Schema to ensure exactly 5 completions in proper format

### Universal Numbered List Format
- **Broad Compatibility**: Used for models without structured output support
- **Reliable Format**: Simple numbered list (1-5) format that works across all model types
- **Intelligent Parsing**: Robust extraction logic handles various response formats
- **Fallback Strategy**: Automatically switches to numbered format when JSON fails

### Reasoning Model Handling
Special handling for advanced reasoning models:

**GPT-5 Series**:
- Handles encrypted reasoning that can't be decrypted
- Uses streaming mode to capture content from reasoning field
- Implements retry logic with simpler prompts when responses are empty
- Falls back to free models (Gemini Flash Lite) if needed

**Gemini 2.5 Pro**:
- Ignores reasoning field (contains thinking, not completions)
- Implements retry with simplified prompts for empty responses
- Uses `reasoning.exclude` parameter to get actual content
- Intelligent fallback chain for reliability

**Other Reasoning Models** (DeepSeek, Qwen, o-series):
- Automatically excludes reasoning content using `reasoning.exclude`
- Prevents thinking/reasoning from appearing in completions
- Maintains focus on actual text completion content

### Triple Fallback System
1. **Primary**: Structured output with JSON Schema (if supported)
2. **Secondary**: Numbered list format with current model
3. **Tertiary**: Free model (Gemini Flash Lite) with simplified prompt

This ensures maximum reliability across OpenRouter's 100+ available models.

## 📝 Completion Modes

The extension offers three completion modes to match different writing contexts:

### Mode Types

**Short Mode (Green Indicator)**
- **Length**: 5-20 words
- **Use Case**: Quick phrase completions, sentence endings
- **Token Limit**: 100 tokens
- **Example**: "The weather today is" → "sunny and warm"

**Medium Mode (Blue Indicator)**
- **Length**: 20-40 words (two sentences)
- **Use Case**: Complete current sentence + add one more
- **Token Limit**: 200 tokens
- **Example**: "The weather today is" → "perfect for a long walk. The sun is shining brightly and there's a gentle breeze."

**Long Mode (Purple Indicator)**
- **Length**: 50-100 words (full paragraph)
- **Use Case**: Paragraph-length completions with natural flow
- **Token Limit**: 400 tokens
- **Example**: Develops complete thoughts with multiple related sentences

### Mode Controls

- **Selection**: Choose mode in popup (General tab) using dropdown menu
- **Quick Switch**: Press **Shift+Alt+M** to cycle through modes
- **Visual Feedback**: Colored dot indicator appears in top-right corner when switching
- **Persistence**: Selected mode is saved across browser sessions

## 🔒 Privacy & Consent System

The extension implements a comprehensive privacy-first design with full GDPR and CCPA compliance:

### First-Run Experience
On first installation, users encounter a full-screen consent interface that:
- **Explains functionality**: Clear description of how the AI autocomplete works
- **Details data usage**: Transparent information about what data is processed and when
- **Provides privacy guarantees**: Explains that text is only processed on explicit trigger (Ctrl+Space)
- **Requires explicit consent**: Users must actively agree to continue using the extension
- **Links to policies**: Direct access to Privacy Policy and Terms of Service

### Consent Management
- **`ConsentScreen.tsx`**: Full-screen React component with professional black/white design
- **`ConsentScreen.css`**: Styled with animations, responsive design, and accessibility features
- **`privacy.ts`**: Complete privacy management module handling consent state and data exports

### Key Privacy Features
- **No Background Processing**: Text is never processed automatically or in the background
- **Explicit Triggering**: Only processes text when user presses Ctrl+Space
- **No Permanent Storage**: Text data is processed in real-time and never stored
- **Field Exclusions**: Automatically excludes password fields and payment forms
- **User Control**: Users can revoke consent by uninstalling the extension
- **Data Export**: GDPR-compliant data export functionality built-in
- **Consent Persistence**: Consent decision stored locally and checked before any functionality

### User Rights
- **Right to Access**: Export all stored data through built-in export function
- **Right to Deletion**: Uninstalling removes all data with no server retention
- **Right to Portability**: Complete data export in structured format
- **Right to Opt-out**: Enhanced detection can be disabled at any time
- **Right to be Forgotten**: Complete data deletion available in settings

## 🎨 Visual Design

The extension features a professional, minimalist design approach:

### Icons & Branding
- **Professional Logo**: "AIAC" text with arrow design representing autocomplete functionality
- **Multiple Sizes**: 16px, 48px, and 128px icons for all Chrome extension requirements
- **SVG Graphics**: All UI elements use SVG icons instead of emojis for professionalism
- **Consistent Theme**: Black (#1a1a1a) and white design throughout all interfaces

### Consent Screen Design
- **Full-screen Interface**: Covers entire browser tab for focused consent experience
- **Animated Elements**: Subtle animations for visual polish without distraction
- **Responsive Design**: Adapts to mobile and desktop viewports
- **Accessibility**: High contrast, readable fonts, and clear visual hierarchy
- **Professional Styling**: Uses system fonts and clean geometric layouts

### UI Components
- **Ghost Text Overlays**: Match the styling of input fields seamlessly
- **Loading States**: Clear visual feedback during AI processing
- **Mode Indicators**: Colored dots (green/blue/purple) for completion modes
- **Keyboard Shortcuts**: Visual keyboard key representations in instructions

## 🏗️ Architecture

### Component Overview

#### 1. **Service Worker (`background/index.ts`)**
The brain of the extension that handles:
- **Consent Enforcement**: Checks user consent before processing any API requests
- **API Communication**: Interfaces with OpenRouter API for AI completions
- **Model Management**: Fetches and caches available AI models
- **Message Routing**: Processes requests from content scripts
- **Storage Management**: Handles settings persistence
- **Privacy Protection**: Blocks all functionality until user provides consent
- **Error Recovery**: Implements fallback strategies for failed API calls

Key Functions:
- `fetchAvailableModels()`: Retrieves and caches AI model list
- `getSystemPrompt()`: Generates mode-specific prompts with custom prompt support
- Message handlers for `GET_COMPLETION` and `GET_MODELS` requests
- **Enhanced Prompt System**: Custom prompts are now properly appended rather than replacing core functionality

#### 2. **Content Script (`content/index.ts`)**
Injected into every webpage to provide the autocomplete interface:
- **Consent Checking**: Wraps all functionality in consent verification
- **Smart Cascade System**: Tries multiple text extraction methods in priority order
- **Customizable Keybinds**: User-configurable keyboard shortcuts
- **UI Management**: Creates and positions ghost text suggestions
- **Enhanced Detection**: Global input/focus event listeners for better coverage
- **Privacy Protection**: Only activates after user consent is confirmed
- **Fallback Mode**: Optional keyboard buffer for difficult sites (requires additional consent)
- **Dynamic Monitoring**: Watches for new text inputs via MutationObserver

Key Features:
- TextExtractionManager for capturing all input events
- KeybindManager for customizable shortcuts
- Ghost text overlay that matches font styling
- Multi-suggestion cycling with visual indicators
- Smart positioning for different input types
- Minimalist selection-based UI for unsupported fields

#### 3. **Universal Detector (`content/universal-detector.ts`)**
The detection engine that identifies and interfaces with text inputs:

**TextElement Interface**:
```typescript
interface TextElement {
  element: HTMLElement;
  type: 'input' | 'textarea' | 'contenteditable' | 'codemirror' | 'ace' | 'monaco' | 'quill' | 'tinymce' | 'ckeditor';
  getText: () => string;
  setText: (text: string) => void;
  insertText: (text: string) => void;
}
```

**Supported Editors**:
- **CodeMirror** (v5 & v6): Popular code editor used in Jupyter, Observable
- **Monaco Editor**: VS Code's editor (GitHub Codespaces, CodeSandbox)
- **Ace Editor**: Cloud9 editor (AWS Cloud9, Replit)
- **Quill**: Rich text editor for blogs and CMSs
- **TinyMCE**: WYSIWYG editor for WordPress, Joomla
- **CKEditor** (v4 & v5): Enterprise content editor
- **Standard HTML**: input, textarea, contenteditable elements

**Detection Methods**:
- `detectTextElement()`: Identifies editor type and returns unified interface
- `getActiveTextElement()`: Finds currently focused text input
- `findAllTextElements()`: Discovers all text inputs on page
- `findAllShadowRoots()`: Recursively searches shadow DOMs

#### 4. **Popup Interface (`popup/Popup.tsx`)**
React-based settings panel featuring four tabs:

**General Tab**:
- **API Key Configuration**: Secure storage of OpenRouter API key
- **Completion Mode Selection**: Dropdown selection for Short/Medium/Long modes
- **Model Selection**: Browse and search ALL 100+ OpenRouter models (no category filtering)
- **Real-time Search**: Instant filtering of available models by name, ID, or description
- **Visual Feedback**: Success/error status messages
- **Streamlined Interface**: Optimized layout for 520px height with full content visibility

**Advanced Tab**:
- **Temperature Control**: Adjust creativity (0-2)
- **Max Tokens**: Display only - automatically set by completion mode
- **Custom System Prompts**: Override default behavior

**Privacy Tab**:
- **Fallback Detection Toggle**: Enable/disable keyboard buffer
- **Privacy Notice**: Clear explanation of data handling
- **Visual Indicators**: Red dot shows when active

**Keybinds Tab**:
- **Customizable Shortcuts**: Configure all keyboard shortcuts including rewrite (Alt+Shift+R)
- **Preset Options**: Multiple choices for each action including autocomplete and rewrite triggers
- **Reset to Defaults**: Quick restore option
- **Immediate Apply**: No restart required

#### 5. **Privacy Management (`utils/privacy.ts`)**
Comprehensive privacy and consent management system:
- **Consent Verification**: `checkHasConsented()` checks user consent status
- **Consent Storage**: `saveConsent()` stores user consent decision with timestamp
- **Settings Management**: `getPrivacySettings()` and `updatePrivacySettings()` for privacy preferences
- **Data Export**: `exportUserData()` provides GDPR-compliant data export
- **Data Deletion**: `deleteAllUserData()` implements "right to be forgotten"
- **Enhanced Detection**: `toggleEnhancedDetection()` manages keyboard buffer privacy mode
- **First Install Detection**: `isFirstInstall()` identifies when to show consent screen
- **Privacy URLs**: `getPrivacyPolicyUrl()` and `getTermsOfServiceUrl()` for policy access

**Privacy Settings Interface**:
```typescript
interface PrivacySettings {
  hasConsented: boolean;
  consentDate?: number;
  enhancedDetection: boolean;
  dataCollection: {
    keyboardInput: boolean;
    selectedText: boolean;
    currentUrl: boolean;
    usageStatistics: boolean;
  };
  version: string;
}
```

#### 6. **Consent Screen (`components/ConsentScreen.tsx`)**
Full-screen privacy consent interface:
- **Professional Design**: Black/white theme with subtle animations
- **Clear Information**: Explains functionality, data usage, and privacy guarantees
- **Interactive Elements**: Expandable details section for technical information
- **Action Buttons**: Accept/Decline with processing states
- **Policy Links**: Direct access to Privacy Policy and Terms of Service
- **Responsive Layout**: Works on desktop and mobile viewports
- **Accessibility**: High contrast, keyboard navigation, screen reader friendly

## 🔧 Technical Implementation

### Logging Architecture
The extension implements a sophisticated logging system designed for Chrome Web Store compliance:

**Development Logger (`src/utils/logger.ts`)**:
- Conditional logging based on build environment
- Separate loggers for background, content, and popup contexts
- Full debugging support with group, table, and timing functions
- Automatically disabled in production builds

**Content Script Logger (`src/content/content-logger.ts`)**:
- Standalone logger bundled directly into content scripts
- Simplified API compatible with content script restrictions
- Independent logging control for content script debugging

**Production Compliance**:
- All console output disabled in production (Chrome Store requirement)
- Error logging preserved for critical debugging
- Clean console output prevents information leakage

### Premium Feature Architecture
Built-in freemium infrastructure ready for monetization:

**Premium Module (`src/utils/premium.ts`)**:
- Stub functions for ExtensionPay integration
- Character limits and feature gating
- Validation functions for premium features
- Ready for seamless freemium activation

**Current Status**:
- All users treated as premium during development
- Infrastructure ready for ExtensionPay integration
- Clear upgrade paths and feature boundaries defined

### Message Flow
```
User Input (Ctrl+Space)
    ↓
Content Script (detectTextElement)
    ↓
Chrome Runtime Message
    ↓
Service Worker (API Call)
    ↓
OpenRouter API
    ↓
5 AI Completions
    ↓
Content Script (Display)
    ↓
User Selection (Tab/Enter)
```

### AI Completion Pipeline

1. **Mode Selection & Loading Feedback**
   - Current completion mode determines token limit and prompt style
   - Cursor changes to "wait" state when Ctrl+Space is pressed
   - Mode indicator briefly shows current mode (green/blue/purple dot)

2. **Smart Text Extraction (Cascade System)**
   - **Priority 1**: Standard field detection via Universal Detector (60% coverage)
   - **Priority 2**: Enhanced extraction via input/focus events (adds 20% coverage)
   - **Priority 3**: Selection-based extraction (user-controlled fallback)
   - **Priority 4**: Keyboard buffer (optional, for canvas sites like Google Docs)
   
3. **Intelligent API Request Processing**
   - **Model Capability Detection**: Checks if model supports structured outputs via OpenRouter API
   - **Structured Output Mode**: Uses JSON Schema with strict validation for compatible models
   - **Numbered List Mode**: Uses reliable 1-5 numbered format for other models
   - **Reasoning Model Handling**: Special logic for GPT-5, Gemini 2.5, and other reasoning models
   - **Custom Prompts**: User style preferences properly appended without breaking core functionality
   - **Dynamic Token Limits**: Mode-based allocation (Short: 100, Medium: 200, Long: 400)

4. **Advanced Response Processing**
   - **Structured Output Parsing**: Direct JSON extraction for compatible models
   - **Numbered List Parsing**: Robust extraction from 1-5 format responses
   - **Multi-Strategy Extraction**: 7 different parsing methods for maximum reliability
   - **Reasoning Field Handling**: Ignores Gemini thinking, extracts GPT-5 content from reasoning
   - **Empty Response Retry**: Automatic retry with simpler prompts for failed responses
   - **Triple Fallback Chain**: Primary model → Numbered format → Free model (Gemini Flash Lite)

5. **Enhanced Text Insertion**
   - Primary: Uses TextElement.insertText() with verification
   - Verification: Checks text growth to confirm successful insertion
   - Fallback: Clipboard-based insertion for difficult elements
   - Manual option: Copies to clipboard if all methods fail

6. **Display Logic**
   - Creates ghost text overlay when field detected
   - Falls back to minimalist popup UI for undetected fields
   - Matches font styling of input
   - Shows current keybinds in instructions
   - Positions based on cursor location

### Model Selection System

The extension provides access to OpenRouter's complete catalog of 100+ AI models without any filtering or categorization.

**Features**:
- **Complete Model Access**: All OpenRouter models are available, including reasoning models
- **Instant Search**: Real-time filtering by model name, ID, or description
- **Visual Model Info**: Pricing, context length, and capabilities displayed for each model
- **No Category Restrictions**: Removed filtering bubbles to show all available models

**Advanced Fallback Strategy**:
- **Structured Output Models**: JSON Schema → Numbered list → Free model
- **Reasoning Models**: Content extraction from reasoning field → Simplified prompts → Free model
- **GPT-5 Handling**: Streaming mode → Non-streaming with reasoning → Free model fallback
- **Gemini 2.5 Pro**: Ignore reasoning field → Retry with exclude reasoning → Free model fallback
- **Empty Responses**: Progressive prompt simplification → Alternative model → Manual completion suggestions
- **API Errors**: Model-specific error handling → Fallback model → User-friendly error messages

### Browser Compatibility

**Manifest V3 Security Features**:
```json
{
  "manifest_version": 3,
  "name": "AI Autocomplete - Smart Text Predictions",
  "version": "0.2.0",
  "permissions": [
    "storage",      // Essential for settings and consent
    "activeTab",    // Current tab access only
    "scripting"     // Content script injection
  ],
  "optional_permissions": ["clipboardWrite"],
  "host_permissions": ["https://openrouter.ai/*"],
  "optional_host_permissions": [
    "https://*/*",     // Secure sites only
    "http://localhost/*"  // Development only
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  },
  "icons": {
    "16": "icon-16.png",    // Professional AIAC logo
    "48": "icon-48.png",    // All sizes included
    "128": "icon-128.png"   // Auto-copied during build
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "all_frames": true,           // Works in iframes
    "match_about_blank": true,    // Handles dynamic frames
    "match_origin_as_fallback": true  // Cross-origin support
  }]
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Chrome/Edge/Brave browser (Chrome 91+)
- OpenRouter API key

### Chrome Web Store Version
Once released on the Chrome Web Store:
1. Search for "AI Autocomplete - Smart Text Predictions"
2. Click "Add to Chrome"
3. **Privacy Consent**: Review and accept the consent screen that appears automatically
4. Configure your OpenRouter API key in the extension popup
5. Start using intelligent text completion on any website!

### Development Version

### Installation

1. **Clone and Build**:
```bash
git clone [repository]
cd ai-autocomplete-ext
npm install
npm run build
```

2. **Load Extension**:
- Open Chrome Extensions (chrome://extensions)
- Enable Developer Mode
- Click "Load unpacked"
- Select `dist` folder

3. **First-Run Consent**:
- **Automatic Display**: Consent screen opens automatically on first installation
- **Review Privacy**: Read privacy information and data processing details
- **Accept Terms**: Click "Accept and Continue" to agree to Privacy Policy and Terms of Service
- **Decline Option**: Click "Decline and Uninstall" to remove the extension

4. **Configure**:
- After consenting, extension popup opens automatically
- Enter your OpenRouter API key
- Select preferred AI model
- Adjust completion modes and settings as needed

### Important Notes
- **Consent Required**: The extension will not function until consent is provided
- **Privacy First**: No text is processed until you explicitly trigger autocomplete (Ctrl+Space)
- **Easy Removal**: Uninstalling removes all data with no server retention
- **Settings Control**: Privacy preferences can be adjusted anytime in the popup

### Development

```bash
npm run dev    # Start development server (with logging enabled)
npm run build  # Build for production (logging disabled)
npm run lint   # Run ESLint
```

**Note**: Development builds include extensive console logging for debugging. Production builds automatically disable all non-error logging for security compliance with Chrome Web Store requirements.

### Build Configuration (`vite.config.ts`)

The build system includes several enhancements to support the privacy consent system:

**Multi-Entry Build**:
```typescript
input: {
  popup: 'src/popup/index.html',
  consent: 'src/consent/consent.html',  // New consent page
  background: 'src/background/index.ts',
  content: 'src/content/index.ts'
}
```

**Automatic Asset Copying**:
- **Icons**: All extension icons (16px, 48px, 128px) auto-copied to dist/
- **Manifest**: Source manifest.json automatically copied during build
- **Build Verification**: Console output confirms successful asset copying

**Build Features**:
- **Consent Page Bundling**: Consent page built as separate entry point
- **Icon Integration**: Professional AIAC logos included in build output
- **Chrome Compatibility**: Targets Chrome 91+ with proper ES module format
- **Development Mode**: Readable output for debugging (minify: false)

## 🎯 Usage Examples

### Completion Mode Workflow
```
1. Type: "The meeting went"
2. Press Shift+Alt+M to cycle to Medium mode (blue indicator appears)
3. Press Ctrl+Space (cursor shows loading state)
4. Get 5 medium-length completions:
   - "well and we covered all agenda items. Everyone seemed engaged."
   - "better than expected with great discussion. We made solid progress."
   - "smoothly despite technical difficulties. The team adapted well."
   - [... 2 more options]
5. Press Tab to cycle through options
6. Press → (right arrow) to accept
```

### Basic Text Input
```html
<input type="text" placeholder="Type here...">
<!-- Ctrl+Space triggers AI completion -->
```

### Code Editor (CodeMirror)
```javascript
// Automatically detected and enhanced
const editor = CodeMirror.fromTextArea(textarea);
// Short mode works well for code comments
```

### Rich Text (Contenteditable)
```html
<div contenteditable="true">
  <!-- Long mode ideal for rich text editing -->
</div>
```

### Dynamic Content
```javascript
// Newly added inputs are automatically detected
document.body.innerHTML += '<textarea></textarea>';
```

## 🔐 Security & Privacy

### Privacy-First Architecture
The extension is built with comprehensive privacy protection and regulatory compliance:

- **Explicit Consent Required**: Full-screen consent interface appears on first installation
- **No Background Processing**: Text is only processed when you explicitly press Ctrl+Space
- **No Permanent Storage**: Text data is processed in real-time and immediately discarded
- **Field Protection**: Password fields and payment forms are automatically excluded
- **User Control**: Complete control over when and how data is processed

### GDPR Compliance (EU Users)
- **Legal Basis**: Consent - users must explicitly agree before any processing
- **Data Minimization**: Only processes text when explicitly triggered by user
- **Purpose Limitation**: Data used solely for AI text completion, nothing else
- **Storage Limitation**: Text not stored permanently, only processed in real-time
- **Right to Access**: Built-in data export function (`exportUserData()`)
- **Right to Erasure**: Uninstalling removes all data with no server retention
- **Right to Portability**: Structured data export available in extension settings
- **Right to Object**: Users can disable enhanced detection mode anytime
- **Data Protection by Design**: Privacy controls built into core architecture

### CCPA Compliance (California Users)
- **No Sale of Personal Information**: We never sell user data to third parties
- **Right to Know**: Clear disclosure of data collection practices in consent screen
- **Right to Delete**: Complete data deletion through uninstall process
- **Right to Opt-Out**: Enhanced detection mode can be disabled in privacy settings
- **Non-Discrimination**: No penalties for exercising privacy rights

### Chrome Web Store Security Compliance
- **Production Logging**: All console output disabled in production builds for security
- **Minimal Permissions**: Reduced to essential permissions only (`storage`, `activeTab`, `scripting`)
- **Optional Permissions**: `clipboardWrite` and broad host permissions are optional
- **Content Security Policy**: Strict CSP prevents XSS attacks (`script-src 'self'; object-src 'none'`)
- **Professional Metadata**: Clean extension name and description for store approval

### Data Processing Details
**What We Process**:
- Text context (only when Ctrl+Space is pressed)
- Selected text for better context
- Current page URL for relevant suggestions
- Optional usage statistics (anonymized, opt-in only)

**How We Process It**:
- Sent to OpenRouter API via encrypted HTTPS
- Processed in real-time for AI completion generation
- Immediately deleted from memory after processing
- Never stored on our servers (we don't have servers)

**Third-Party Processing**:
- **OpenRouter**: Processes text according to their privacy policy
- **ExtensionPay**: Handles payments (premium users only)
- No other third-party data sharing

### Technical Security Measures
- **API Key Encryption**: OpenRouter keys encrypted in Chrome sync storage
- **HTTPS-Only Communication**: All API calls use secure connections
- **Isolated Content Scripts**: Run in sandboxed browser context
- **Input Validation**: All user inputs sanitized and validated
- **Secure Manifest**: Strict permissions model with CSP protection
- **Privacy URLs**: Direct links to Privacy Policy and Terms of Service

## 🐛 Known Limitations & Solutions

### Canvas-Based Sites (Google Docs, Sheets, Slides)
- **Autocomplete**: Currently limited on canvas-based sites
- **Rewrite**: Fully functional with workaround - select and copy text first
- **Limitation Notice**: Shows friendly popup explaining limitations and workarounds
- **Message**: "Canvas-based sites have limited support" with "Full support coming soon!"
- **Workaround**: Copy text to clipboard, then use rewrite feature

### Reasoning Model Issues
1. **GPT-5 Encrypted Reasoning**: Extension automatically handles encrypted reasoning responses
2. **Gemini 2.5 Pro Thinking**: Ignores reasoning field that contains thinking instead of completions
3. **Empty Responses**: Automatic retry with progressively simpler prompts
4. **Model Compatibility**: Triple fallback ensures completion generation even with difficult models

### Other Limitations
1. **Cross-origin iframes**: Browser security limitation (no workaround)
2. **External paste from other apps**: Not captured by keyboard buffer (AI completions are tracked)
3. **Some React inputs**: Enhanced detection usually works, fallback available
4. **Enhanced Detection**: Enable "Fallback Detection" in Privacy settings for difficult sites

## 🛠️ Troubleshooting

### Model-Specific Issues

**"Empty completion received"**:
- Extension automatically retries with simpler prompts
- Falls back to free model (Gemini Flash Lite) if primary model fails
- Check model compatibility in OpenRouter dashboard

**"Model returned reasoning instead of completions"**:
- Normal for Gemini 2.5 Pro - extension handles this automatically
- GPT-5 reasoning is extracted from reasoning field when needed
- No user action required

**"JSON parsing failed"**:
- Extension automatically switches to numbered list format
- Uses 7 different parsing strategies for maximum reliability
- Falls back to single completion extraction if needed

### Common Solutions
1. **Try a different model**: Use model selector in popup to switch
2. **Check API key**: Ensure OpenRouter API key is valid and has credits
3. **Use fallback detection**: Enable in Privacy tab for difficult sites
4. **Reload extension**: Click "Refresh Models" in popup if models don't load
5. **Check console**: Development versions show detailed logging for debugging

## 🛠️ Advanced Configuration

### Custom System Prompts
**Premium Feature**: Override default completion behavior with custom style preferences:
```
Generate technical documentation style completions
Focus on code comments and explanations
Use formal academic writing style
```

**Important**: Custom prompts are applied as "User Style Preferences" before the core completion instructions, ensuring JSON formatting remains intact. Limited to 500 characters for premium users.

**Fixed Bug**: Previously, custom prompts completely replaced the system prompt, breaking JSON formatting and extension functionality. Now they're properly appended to enhance rather than override the base behavior.

### Model Parameters
- **Temperature** (0-2): Creativity vs consistency
- **Max Tokens**: Automatically set by completion mode (100/200/400)
- **Model Selection**: Choose based on use case
- **Completion Mode**: Overrides manual token settings for consistent results

### Customizable Keybinds
Configure shortcuts to match your workflow:
- **Trigger Autocomplete**: Ctrl+Space, Alt+Space, Ctrl+Period
- **Trigger Rewrite**: Alt+Shift+R (default), Ctrl+Shift+E, Ctrl+Shift+R
- **Accept**: Right Arrow (default), Ctrl+Enter, Shift+Enter
- **Cycle**: Tab, Down Arrow, Ctrl+Down
- **Dismiss**: Escape, Ctrl+Escape, Backspace
- **Mode Cycling**: Shift+Alt+M (cycles through Short/Medium/Long modes)

### Text Extraction Methods
The extension uses a smart cascade system (see `text-extraction-methods.md` for details):
1. Standard field detection (60% coverage)
2. Enhanced input/focus events (+20% coverage)
3. Selection-based extraction (user fallback)
4. Keyboard buffer (optional, 95%+ coverage)

## 📊 Performance & Compatibility

### Coverage Statistics
- **60%**: Standard field detection alone
- **80%**: With enhanced input/focus events
- **85%**: With selection-based fallback
- **95%+**: With optional keyboard buffer

### Performance Optimization
- **Lazy Loading**: Detectors initialized on-demand
- **Caching**: Model list cached for 1 hour
- **Smart Cascade**: Tries least invasive methods first
- **Event Delegation**: Efficient global listeners
- **Selective Injection**: Only active elements enhanced

## 📊 Release Roadmap

### Current Status: Pre-Release (v0.2.0)
- **✅ Security Hardening**: Complete
- **✅ Critical Bug Fixes**: Complete  
- **✅ Premium Infrastructure**: Complete
- **⏳ ExtensionPay Integration**: Pending
- **⏳ Chrome Web Store Submission**: Pending

### Upcoming Milestones
1. **Week 1**: ExtensionPay integration and freemium implementation
2. **Week 2**: Final testing, privacy policy, and Chrome Store preparation  
3. **Week 3**: Chrome Web Store submission and launch

### Public Release Features (v1.0.0)
- Freemium model with premium custom prompts
- Privacy compliance and user consent flows
- Production-ready security hardening
- Chrome Web Store optimization

For detailed release planning, see `PUBLIC_RELEASE_PLAN.md`.

## 🤝 Contributing

The extension is designed for easy enhancement:

### Adding New Editor Support
1. Add detection function to `universal-detector.ts`
2. Implement TextElement interface
3. Add selector to `findAllTextElements()`

### Improving Detection
1. Add new selectors for edge cases
2. Enhance shadow DOM traversal
3. Optimize MutationObserver filters

## 📝 License

This project is prepared for commercial release. License terms will be defined upon Chrome Web Store publication.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- Chrome Extensions team for Manifest V3
- Community for editor detection patterns

---

## 🚀 Chrome Web Store Readiness

### Privacy & Consent Implementation (v0.2.0)
- **🔒 Full Consent System**: Complete GDPR/CCPA compliant consent flow on first installation
- **📜 Privacy Documentation**: Comprehensive Privacy Policy and Terms of Service documents
- **🎨 Professional Consent UI**: Full-screen black/white themed consent interface
- **🔐 Privacy-First Architecture**: All functionality blocked until user consent is provided
- **📊 Data Rights**: Built-in data export, deletion, and privacy preference management
- **⚖️ Regulatory Compliance**: Full GDPR Article 7 and CCPA compliance built-in

### Security Hardening (v0.2.0)
- **🔒 Production Logger System**: Replaced 143+ console.log statements with conditional development-only logging
- **🛡️ Minimal Permissions**: Reduced manifest permissions to only essential ones for Chrome Store approval
- **🔐 Content Security Policy**: Added strict CSP to prevent XSS attacks and improve security
- **✨ Professional Branding**: Updated extension name to "AI Autocomplete - Smart Text Predictions"
- **🎨 Professional Icons**: AIAC logo design with multiple sizes (16px, 48px, 128px)

### Premium Infrastructure
- **💎 Premium Feature Framework**: Added stub implementation ready for ExtensionPay integration
- **📝 Character Limits**: 500-character limit for custom prompts (premium feature)
- **🎯 Freemium Ready**: Architecture prepared for monetization with clear premium/free boundaries
- **📊 Usage Controls**: Built-in validation and enforcement for premium features

### Technical Implementation
- **🏗️ Build System**: Multi-entry build with consent page and automatic asset copying
- **📱 Responsive Design**: Consent screen works on desktop and mobile viewports
- **♿ Accessibility**: High contrast, keyboard navigation, screen reader support
- **🔧 Privacy Module**: Complete privacy management system (`privacy.ts`)
- **📋 Consent Component**: Professional React component with animations (`ConsentScreen.tsx`)

### Critical Bug Fixes
- **🐛 Custom Prompt Fix**: Resolved critical issue where custom prompts broke JSON formatting
- **🔧 Content Script Modules**: Fixed import statement errors in content scripts with separate logger
- **⚡ Build Optimization**: Updated Vite configuration to properly bundle all components

## 📈 Recent Updates (v0.2.0)

### 🚀 Latest Improvements (Current Session)
- 🤖 **Structured Outputs Support**: Automatic detection of models supporting JSON Schema for guaranteed valid JSON responses
- 🔢 **Universal Numbered List Format**: Reliable 1-5 numbered format for models without structured output support  
- 🧠 **Advanced Reasoning Model Handling**: Intelligent processing for GPT-5, Gemini 2.5 Pro, and other reasoning models
- 🔄 **Triple Fallback System**: Structured output → numbered list → free model for maximum reliability
- ⚙️ **GPT-5 Encrypted Reasoning Fix**: Proper extraction of content from encrypted reasoning responses using streaming mode
- 💭 **Gemini 2.5 Pro Fix**: Ignores reasoning field that contains thinking instead of actual completions
- 📊 **Multi-Strategy Parsing**: 7 different extraction methods for maximum response reliability
- 🕐 **Fixed Rewrite UI Timeout Bug**: Rewrite UI now stays visible for full 60 seconds without premature disappearing
- 🎨 **Intelligent Rewrite Variations**: Single rewrite responses now generate 3 contextually different variations
- 📝 **Simplified Rewrite Prompt**: Uses numbered format (1-3) for better reliability across all models

### 🆕 Core Features (v0.2.0)
- 🔒 **Privacy Consent System**: Full-screen consent interface with GDPR/CCPA compliance
- 📜 **Legal Documentation**: Comprehensive Privacy Policy and Terms of Service
- 🎨 **Professional UI Design**: Black/white theme with SVG icons throughout
- 📝 **Three Completion Modes**: Short (5-20 words), Medium (20-40 words), Long (50-100 words)
- ✍️ **AI Text Rewriting**: Select text and rewrite with 3 AI-generated options using Alt+Shift+R
- 🔄 **Mode Cycling**: Quick Shift+Alt+M shortcut to switch between modes
- 🔵 **Visual Mode Indicators**: Colored dots (green/blue/purple) show current mode
- ⏳ **Loading Cursor Feedback**: Visual feedback when processing AI requests
- 📊 **Dynamic Token Limits**: Automatic token allocation based on selected mode
- 🔧 **Enhanced Text Insertion**: Improved reliability with verification and fallback methods
- ✨ **Smart Cascade Text Extraction**: Multiple detection methods for 85%+ compatibility
- ⌨️ **Customizable Keybinds**: Full control over all keyboard shortcuts including rewrite
- 🔐 **Enhanced Privacy Controls**: Optional fallback mode with clear consent
- 🎯 **Streamlined Model Access**: Removed category filtering to show ALL OpenRouter models
- 📐 **Optimized Popup UI**: Fixed 520px height with space-efficient layout
- 🖼️ **Extension Icons**: Professional AIAC logo design for all sizes
- 📝 **Canvas Site Support**: Special handling for Google Docs with friendly limitation notices

### 🔧 Technical Improvements
- **Privacy Management System**: Complete `privacy.ts` module with consent and data management
- **Consent Screen Component**: Professional React component with animations and accessibility
- **Multi-Entry Build System**: Vite configuration includes consent page and asset copying
- **Consent Enforcement**: Background script and content script check consent before processing
- **Professional Icons**: AIAC logo design with 16px, 48px, and 128px versions
- CompletionModeManager for mode persistence and cycling
- Mode-specific prompts with different completion styles
- Enhanced text insertion with verification and fallback strategies
- Loading cursor state management
- TextExtractionManager for global input event capture
- KeybindManager for dynamic shortcut configuration
- Visual indicators for active detection modes
- Improved error handling and fallback model support
- **Development Logger System**: Conditional logging disabled in production
- **Content Script Logger**: Separate bundled logger for content scripts
- **Premium Infrastructure**: Complete freemium architecture with ExtensionPay integration points
- **Security Hardening**: Manifest V3 compliance with minimal permissions and CSP

### 🎨 UI/UX Enhancements
- **Simplified Model Selection**: Removed category filtering to show all available models
- **Dropdown Mode Selection**: Replaced radio buttons with space-efficient dropdown
- **Fixed Height Layout**: Optimized 520px popup height for consistent experience
- **Dynamic Content Fitting**: General tab content always visible without scrolling
- **Persistent Button Bar**: Save Settings and Refresh Models always visible at bottom
- **Instant Model Search**: Real-time filtering across all OpenRouter models
- **Loading feedback during AI processing**
- **Improved instruction tooltips with current keybind displays**
- **Clean, modern interface for selection-based completions**

---

**Version**: 0.2.0 (Pre-Release)  
**Target Release**: v1.0.0 in Q1 2025  
**Last Updated**: January 2025  
**Status**: Chrome Web Store Preparation  
**Compatibility**: Chrome 91+, Edge, Brave (Manifest V3)

### Recent Major Changes (v0.2.0)
- **🔒 Added**: Complete privacy consent system with GDPR/CCPA compliance
- **📜 Added**: Comprehensive Privacy Policy and Terms of Service documents
- **🎨 Added**: Professional consent UI with black/white theme and animations
- **🖼️ Added**: Extension icons with professional AIAC logo design
- **🏗️ Added**: Multi-entry build system with automatic asset copying
- **🔐 Added**: Privacy-first architecture blocking functionality until consent
- **🐛 Fixed**: Critical custom prompt bug that broke JSON formatting
- **🔒 Added**: Production logging system for Chrome Store compliance
- **🛡️ Added**: Security hardening with minimal permissions and CSP
- **💎 Added**: Premium infrastructure ready for ExtensionPay
- **⚡ Fixed**: Content script module import issues
- **📝 Added**: Character limits and validation for premium features

### Security & Privacy Improvements
- **Complete consent flow implementation with privacy-first design**
- **GDPR Article 7 compliance with explicit consent collection**
- **CCPA compliance with data rights and opt-out mechanisms**
- **Professional consent interface with clear information disclosure**
- **Privacy management module with data export and deletion capabilities**
- All development logging disabled in production builds
- Reduced permissions to essential-only for Chrome Store approval
- Strict Content Security Policy prevents XSS attacks
- Professional extension naming and metadata with icon assets
- Clear premium feature boundaries with validation