# AI Autocomplete Website & Extension Project

Official website for the AI Autocomplete Chrome Extension (v0.3.0) - providing intelligent text predictions and AI chat powered by 300+ AI models.

🌐 **Live Site:** [https://manningaskew7.github.io/ai-autocomplete-website/](https://manningaskew7.github.io/ai-autocomplete-website/)
🎓 **Tutorial:** [https://manningaskew7.github.io/ai-autocomplete-website/tutorial.html](https://manningaskew7.github.io/ai-autocomplete-website/tutorial.html)

## 📋 Overview

This is the public-facing website for AI Autocomplete, a Chrome extension that brings AI-powered text completion and chat to any webpage. The extension is currently in **Free Launch Phase (v0.3.0)** with all premium features unlocked.

### Website Features:
- **Landing Page** - Product features, 300+ AI models showcase, and pricing
- **Tutorial Page** - Comprehensive guide with injection modes, keyboard shortcuts, and troubleshooting
- **Privacy Policy** - GDPR/CCPA compliant privacy documentation  
- **Terms of Service** - Legal terms and usage guidelines
- **Professional Design** - Minimalist black/grey/white theme matching the extension UI

### 🆕 New in v0.3.0: AI Chat Feature
- **Full AI Chat Interface** - Press Alt+Shift+C to open a dedicated chat window
- **300+ AI Models** - Chat with GPT-5, Claude 4, Gemini 2.5 Pro, DeepSeek V3.1, and more
- **Dark Theme UI** - Matches extension design with smooth animations and responsive layout
- **Smart Token Management** - Uses full token limits (up to 62,000), shows current settings
- **Optional System Prompts** - Chat works without system prompts for more natural responses
- **Phase 1 Implementation** - No conversation memory yet, each message is independent
- **Instant Access** - Available on any webpage where the extension is active

### Extension Features (v0.3.0):
- **AI Text Completion** - Access 300+ models (GPT-5, Claude 4, Gemini 2.5, DeepSeek V3.1, etc.)
- **AI Chat Interface** - Full conversational AI accessible via Alt+Shift+C with dark theme UI
- **Text Rewriting** - AI-powered text improvement and rewrites
- **Completion Modes** - Short (5-20 words), Medium (20-40 words), Long (50-100 words)
- **8 Customizable Keybinds** - Including completion mode switcher and chat opener
- **Extended Token Limits** - Up to 62,000 tokens for chat and high-token completion modes
- **3 Injection Modes** - Conservative, Balanced, and Aggressive for different privacy needs
- **Enhanced Detection** - Improved support for Google Docs and canvas-based editors
- **Privacy-First Design** - Text only sent to AI when YOU trigger it

## 🏗️ Repository Structure & Deployment

### ⚠️ Important: Dual Directory Structure

This project has a unique structure due to GitHub Pages requirements:

**TWO LOCATIONS for website files:**
- **Root Directory** (`/`, `/css/`, `/js/`, `/assets/`) - **This is what GitHub Pages serves**
- **Website Subdirectory** (`/website/`, `/website/css/`, `/website/js/`, `/website/assets/`) - Development files

**Why This Exists:**
- GitHub Pages serves files from the repository root directory, NOT from `/website/`
- When making website changes, files must be manually copied from `/website/` to root
- This ensures GitHub Pages deployment works while maintaining organized development structure

### Current Repository Setup:

**Dual Remote Configuration:**
```bash
origin-extension    # https://github.com/ManningAskew7/ai-autocomplete-extension
origin-website      # https://github.com/ManningAskew7/ai-autocomplete-website
```

- **Private Extension Repo** (`origin-extension`): Contains Chrome extension source code
- **Public Website Repo** (`origin-website`): Contains website files served by GitHub Pages

### Development Workflow for Website Updates:

1. **Make changes** in `/website/` directory (development files)
2. **Copy to root** for GitHub Pages:
   ```bash
   cp website/index.html index.html
   cp website/tutorial.html tutorial.html
   cp website/privacy.html privacy.html
   cp website/terms.html terms.html
   cp -r website/css/ css/
   cp -r website/js/ js/
   cp -r website/assets/ assets/
   ```
3. **Commit and push** to website repository:
   ```bash
   git add .
   git commit -m "Update website"
   git push origin-website main
   ```
4. **GitHub Pages auto-deploys** in 1-2 minutes

### Files That Require Dual Updates:
- `index.html` (both `/` and `/website/`)
- `tutorial.html` (both `/` and `/website/`)
- `privacy.html` and `terms.html`
- All CSS files in `/css/` and `/website/css/`
- All JS files in `/js/` and `/website/js/`
- All assets in `/assets/` and `/website/assets/`

## 🚀 Quick Deploy to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Repository settings:
   - **Name:** `ai-autocomplete-website`
   - **Visibility:** `Public` (required for free GitHub Pages)
   - **Initialize:** Don't add README (you'll use this one)
4. Click **Create repository**

### Step 2: Upload Website Files

#### Option A: Using GitHub Web Interface (Easiest)
1. Click **uploading an existing file** link on the new repo page
2. Drag all files from the `website` folder (NOT the folder itself):
   - `index.html`
   - `privacy.html`
   - `terms.html`
   - `test.html`
   - `css/` folder
   - `js/` folder
   - `assets/` folder
   - This `README.md`
3. Write commit message: "Initial website deployment"
4. Click **Commit changes**

#### Option B: Using Git Command Line
```bash
# Navigate to the website folder
cd C:\Auto-Complete-Project\website

# Initialize git
git init

# Add all files
git add .

# Commit files
git commit -m "Initial website deployment"

# Add your repository as origin (replace with your username)
git remote add origin https://github.com/YOUR_USERNAME/ai-autocomplete-website.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section (left sidebar)
4. Under **Source**:
   - Select **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

### Step 4: Access Your Live Website

1. Wait 2-5 minutes for initial deployment
2. Your site will be available at:
   ```
   https://YOUR_USERNAME.github.io/ai-autocomplete-website/
   ```
3. Check deployment status in the **Actions** tab

## 📁 Project Structure

### Website Files (Dual Location Structure):
```
ai-autocomplete-website/
├── # ROOT DIRECTORY (GitHub Pages serves from here)
├── index.html              # Main landing page with 300+ AI models
├── tutorial.html           # NEW: Comprehensive tutorial with keybinds
├── privacy.html            # Privacy Policy page
├── terms.html              # Terms of Service page
├── test.html               # Test page with links to all sections
├── README.md               # This file
├── css/
│   ├── styles.css          # Main stylesheet
│   ├── tutorial.css        # NEW: Tutorial-specific styles
│   └── legal.css           # Legal pages specific styles
├── js/
│   └── main.js             # Interactive features and animations
├── assets/
│   ├── logo.svg            # SVG logo
│   ├── logo-black.svg      # Black version for light backgrounds
│   ├── logo-white.svg      # White version for dark backgrounds
│   └── logo-original.jpg   # Original JPG logo
└── website/                # DEVELOPMENT DIRECTORY (mirror of root)
    ├── index.html          # Development copy
    ├── tutorial.html       # Development copy
    ├── privacy.html        # Development copy
    ├── terms.html          # Development copy
    ├── css/
    │   ├── styles.css      # Development copy
    │   ├── tutorial.css    # Development copy
    │   └── legal.css       # Development copy
    ├── js/
    │   └── main.js         # Development copy
    └── assets/             # Development copy of assets
```

### Extension Source Code:
```
ai-autocomplete-ext/
├── manifest.json           # Extension manifest (v0.3.0)
├── src/
│   ├── popup/             # Extension popup interface
│   ├── content/           # Content scripts for web pages
│   │   ├── index.ts       # Main content script with keybind handling
│   │   └── chat-ui-manager.ts  # NEW: Chat UI and state management
│   ├── background/        # Service worker scripts
│   │   ├── index.ts       # Main background script with chat API
│   │   └── prompts.ts     # System prompts and token limits
│   └── components/        # React components
├── public/
│   ├── icons/            # Extension icons
│   └── manifest.json     # Public manifest
├── test-chat.html        # NEW: Chat feature testing page
└── dist/                 # Built extension files
```

## 🔧 Updating the Website

### Making Changes (Important: Dual Directory Process)

**⚠️ CRITICAL:** Always update files in `/website/` directory first, then copy to root!

1. **Edit development files** in `/website/` directory
2. **Test changes** by opening `/website/index.html` in your browser
3. **Copy updated files to root** for GitHub Pages:
   ```bash
   # Copy specific files that changed
   cp website/index.html index.html
   cp website/tutorial.html tutorial.html  # If tutorial was updated
   cp website/css/styles.css css/styles.css  # If CSS was updated
   
   # Or copy all files (be careful not to overwrite non-website files)
   cp website/*.html .
   cp -r website/css/* css/
   cp -r website/js/* js/
   cp -r website/assets/* assets/
   ```
4. **Commit and push** to website repository:
   ```bash
   git add .
   git commit -m "Describe your changes"
   git push origin-website main
   ```
5. **GitHub Pages auto-updates** in 1-2 minutes

### Technical Improvements in v0.3.0:

1. **Enhanced AI Model Support**:
   - **GPT-5 Compatibility** - Fixed support with proper high token limit handling
   - **Gemini 2.5 Pro Reasoning** - Improved parsing of reasoning model responses
   - **Token Management** - Smart handling for reasoning models up to 62,000 tokens
   - **Fallback Systems** - Automatic model fallbacks for better reliability

2. **Chat Implementation**:
   - **Dedicated Chat UI Manager** - New `chat-ui-manager.ts` with full UI state management
   - **Background Script Integration** - Enhanced `GET_CHAT_RESPONSE` message handling
   - **Keybind Integration** - Alt+Shift+C keybind with conflict prevention
   - **Settings Display** - Shows current max tokens and custom prompt status

3. **Improved Keybind System**:
   - **8 Total Keybinds** - Added completion mode switcher and chat opener
   - **Dynamic Loading** - Keybinds load from storage with backward compatibility
   - **Conflict Prevention** - Better handling of overlapping key combinations

### Previous Features Added (v0.2.0):

1. **Tutorial Page** (`tutorial.html`):
   - Complete keyboard shortcuts reference (7 keybinds)
   - Injection modes explanation (Conservative/Balanced/Aggressive)
   - Pro tips for different AI models
   - Troubleshooting guide
   - Mobile-responsive design

2. **AI Models Showcase**:
   - Updated from "100+" to "300+" models
   - Features GPT-5, Claude 4, Gemini 2.5, DeepSeek V3.1
   - Dark-themed section with hover effects
   - Emphasizes OpenRouter API access

3. **Enhanced Navigation**:
   - Added Tutorial link to navigation
   - Footer includes tutorial and GitHub links
   - Updated support email: `maextensions.help@gmail.com`

### Current Configuration (No Placeholders):

✅ **All files are production-ready:**
- Chrome Web Store URL: Points to Chrome Web Store (pending submission)
- GitHub repository: `https://github.com/ManningAskew7/ai-autocomplete-website`
- Support email: `maextensions.help@gmail.com`
- Live website: `https://manningaskew7.github.io/ai-autocomplete-website/`

## 🎨 Customization Guide

### Logo Assets
Multiple logo versions available:
- `assets/logo.svg` - Default logo
- `assets/logo-black.svg` - Black version for light backgrounds
- `assets/logo-white.svg` - White version for dark backgrounds
- `assets/logo-original.jpg` - Original JPG version

**To update logos:**
1. Update files in both `/website/assets/` and `/assets/` directories
2. Maintain minimalist black/white aesthetic
3. Ensure all versions work across different backgrounds

### Color Scheme
Edit CSS variables in `css/styles.css`:
```css
:root {
    --color-black: #1a1a1a;
    --color-dark-grey: #2a2a2a;
    --color-grey: #3a3a3a;
    --color-light-grey: #e0e0e0;
    --color-white: #ffffff;
    --color-accent: #4a9eff;
}
```

### Adding Demo Video
Replace the placeholder in `index.html`:
1. Find the `demo-placeholder` section
2. Replace with actual video embed or player

## 🔗 Chrome Extension Integration

### 📋 Known Issues & Limitations (v0.3.0)

#### Chat Feature (Phase 1):
- **No Conversation Memory** - Each chat message is independent, no context retention
- **No Chat History** - Conversations don't persist between sessions
- **GPT-5 Token Requirements** - GPT-5 needs high token limits (500+) to function properly
- **Single Conversation** - Only one chat window at a time per tab

#### Model-Specific Issues:
- **Reasoning Models** - Some reasoning models may have delayed responses due to processing
- **Token Limits** - Very large completions may be truncated by model limits
- **Fallback Behavior** - Failed requests automatically retry with Gemini 2.5 Flash Lite

#### Planned Improvements:
- **Phase 2**: Conversation history and message persistence
- **Phase 3**: Multi-conversation support and enhanced memory system
- **Enhanced GPT-5**: Better integration with reasoning model capabilities

### Current Extension Configuration (v0.3.0):

**✅ Already Connected:**
```json
"homepage_url": "https://manningaskew7.github.io/ai-autocomplete-website/"
```

### Extension Features in Free Launch Phase:
- **8 Customizable Keybinds** including chat opener and completion mode switcher
- **AI Chat Interface** with Alt+Shift+C keybind for instant access
- **Extended Token Support** up to 62,000 tokens for chat and high-end models
- **3 Injection Modes** (Conservative/Balanced/Aggressive)
- **Enhanced Detection** for Google Docs support
- **Text Rewriting** with 5 AI-generated alternatives
- **300+ AI Models** via OpenRouter API
- **Popup Footer Links** to Tutorial, Website, and Report Issue

### Complete Keybind Set (8 total):
- `Ctrl+Space` - Trigger AI completion
- `Alt+Shift+C` - Open AI chat interface (NEW)
- `Shift+Alt+M` - Switch completion modes (Short/Medium/Long)
- `Alt+Shift+R` - Rewrite selected text
- `Ctrl+Shift+Space` - Manual inject on current page
- `Arrow Right` - Accept completion
- `Tab` - Cycle through completions
- `Escape` - Dismiss completions

### Privacy Integration:
- Extension popup links to website privacy policy
- Tutorial page explains privacy-focused design
- Terms of service updated for OpenRouter API usage

## 📊 GitHub Pages Features

### Included Automatically:
- ✅ Free HTTPS/SSL certificate
- ✅ CDN distribution
- ✅ Automatic deployment on push
- ✅ Custom domain support (optional)

### Limitations:
- 1GB repository size limit
- 100GB monthly bandwidth
- 10 builds per hour
- No server-side code

## 🌐 Custom Domain (Optional)

To use a custom domain like `aiautocomplete.com`:

1. Buy domain from registrar (Namecheap, GoDaddy, etc.)
2. Create `CNAME` file in repository root with your domain
3. Configure DNS settings at registrar:
   - A records → GitHub Pages IPs
   - CNAME → YOUR_USERNAME.github.io
4. Enable HTTPS in GitHub Pages settings

## 🛠️ Development Tips

### Local Testing
```bash
# Simple Python server
python -m http.server 8000

# Or using Node.js
npx http-server

# Or just open index.html directly in browser
```

### Browser Compatibility
Tested and working on:
- Chrome 91+
- Edge
- Firefox
- Safari
- Mobile browsers

### Performance
- All assets optimized for fast loading
- CSS/JS minification recommended for production
- Images should be optimized before upload

## 📝 Maintenance Checklist

### ✅ Completed for v0.3.0 Launch:
- [x] Added AI Chat feature with Alt+Shift+C keybind
- [x] Extended token limits to 62,000 for high-end models
- [x] Fixed GPT-5 compatibility with proper token handling
- [x] Enhanced Gemini 2.5 Pro reasoning model support
- [x] Updated keybind system to 8 customizable shortcuts
- [x] Implemented chat UI with dark theme matching extension
- [x] Added smart token management and settings display
- [x] Created comprehensive chat API integration
- [x] Updated all documentation to reflect v0.3.0 features
- [x] All previous v0.2.0 features maintained and improved

### Before Chrome Web Store Submission:
- [ ] Add actual demo video/screenshots to replace placeholder
- [ ] Submit extension for Chrome Web Store review
- [ ] Update Chrome Web Store link once approved
- [ ] Add user testimonials as they come in

### Post-Launch Maintenance:
- [ ] Monitor chat feature usage and user feedback
- [ ] Prepare Phase 2 chat development (conversation history)
- [ ] Monitor AI model updates and update counts
- [ ] Add FAQ section for chat feature questions
- [ ] Update tutorial page with chat usage examples
- [ ] Track and update keybind documentation for new chat shortcuts
- [ ] Keep privacy policy current with chat feature data handling

### Development Workflow Reminders:
- [ ] Always edit in `/website/` directory first
- [ ] Copy changes to root directory for GitHub Pages
- [ ] Test dual directory synchronization
- [ ] Commit to correct remote (`origin-website` for website changes)

## 💡 Future Enhancements

### Planned Website Features:
- **Demo Video Integration** - Replace current placeholder with actual usage video
- **User Testimonials** - Add reviews from beta testers and early users
- **FAQ Section** - Based on common user questions from tutorial feedback
- **Blog/Updates Section** - Extension updates, AI model additions, feature announcements
- **Download Statistics** - Chrome Web Store install counts and usage metrics
- **Newsletter Signup** - For extension updates and AI industry news

### Chat Development Roadmap:

#### Phase 2 (Next Update - v0.4.0):
- **Conversation History** - Persistent chat history across sessions
- **Context Memory** - Maintain conversation context within single sessions
- **Chat Export** - Save conversations as text or markdown files
- **Model Switching** - Change AI models mid-conversation

#### Phase 3 (Future - v0.5.0):
- **Multi-Conversation Support** - Multiple chat tabs/windows simultaneously
- **Advanced Memory System** - Long-term context retention and learning
- **Chat Templates** - Pre-built conversation starters for different use cases
- **Collaborative Features** - Share conversations and templates

### Planned Extension Features (Future Versions):
- **Premium Tier** (post-free launch phase) - Advanced AI models and features
- **Custom AI Model Integration** - Support for private/local AI models
- **Team/Enterprise Features** - Shared prompts and organizational settings
- **Advanced Analytics** - Usage tracking and productivity metrics
- **Multi-language Support** - AI completions in different languages
- **Context Templates** - Pre-built prompts for emails, code, creative writing

### Technical Improvements:
- **Automated Deployment** - GitHub Actions for website/extension builds
- **Single Directory Structure** - Resolve dual directory issue with proper build process
- **Performance Optimization** - Faster AI response times and caching
- **Enhanced Testing** - Automated testing for website and extension compatibility

## 📄 License

This website is part of the AI Autocomplete Chrome Extension project.

## 🤝 Support

For issues or questions about the website:
1. Open an issue in this repository
2. Contact: [Your support email]

---

## 🔄 Repository Management

**Dual Repository Structure:**
- **This Repository** (`origin-website`): Public website files served by GitHub Pages
- **Extension Repository** (`origin-extension`): Private Chrome extension source code

**Key Files for Extension v0.3.0:**
- Current version in Free Launch Phase with all premium features unlocked
- 7 customizable keybinds including completion mode switcher
- Support for 300+ AI models via OpenRouter API
- Enhanced Google Docs compatibility with Aggressive injection mode

**Development Notes for Future Contributors:**
- Website changes: Edit in `/website/`, copy to root, push to `origin-website`
- Extension changes: Work in `/ai-autocomplete-ext/`, push to `origin-extension`
- Always maintain dual directory synchronization for website files
- Tutorial page documents all current extension features and keybinds