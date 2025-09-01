# AI Autocomplete Project - Deployment Guide

This guide explains how to manage and deploy the AI Autocomplete project with a **private extension repository** and a **public website repository**.

## 📂 Repository Structure Strategy

### Current Local Structure:
```
C:\Auto-Complete-Project\
├── ai-autocomplete-ext/    # Chrome extension source (KEEP PRIVATE)
│   ├── src/                 # Source code
│   ├── dist/                # Built extension
│   ├── package.json
│   └── README.md
├── website/                 # Website files (MAKE PUBLIC)
│   ├── index.html
│   ├── privacy.html
│   ├── terms.html
│   └── README.md
└── DEPLOYMENT_GUIDE.md      # This file
```

## 🔒 Repository Setup

### 1. Private Repository (Extension Code)
**Repository Name:** `auto-complete-project` or `ai-autocomplete-private`

This will contain:
- The entire `ai-autocomplete-ext` folder
- Development documentation
- Build scripts
- Any sensitive configuration

**Steps:**
```bash
# From C:\Auto-Complete-Project
git init
git add ai-autocomplete-ext/
git add DEPLOYMENT_GUIDE.md
git add PUBLIC_RELEASE_PLAN.md
git commit -m "Initial extension project"
git remote add origin https://github.com/YOUR_USERNAME/auto-complete-project.git
git push -u origin main
```

**Settings:**
- Visibility: **PRIVATE** ✅
- Add collaborators if needed
- Enable branch protection for main branch

### 2. Public Repository (Website)
**Repository Name:** `ai-autocomplete-website`

This will contain:
- All files from the `website` folder
- Public documentation
- GitHub Pages hosting

**Steps:**
```bash
# From C:\Auto-Complete-Project\website
git init
git add .
git commit -m "Initial website deployment"
git remote add origin https://github.com/YOUR_USERNAME/ai-autocomplete-website.git
git push -u origin main
```

**Settings:**
- Visibility: **PUBLIC** ✅
- Enable GitHub Pages
- Add topics: `chrome-extension`, `ai`, `autocomplete`, `website`

## 🚀 Deployment Workflow

### For Extension Development (Private):

1. **Development:**
   ```bash
   cd C:\Auto-Complete-Project\ai-autocomplete-ext
   npm run dev
   ```

2. **Build for Production:**
   ```bash
   npm run build
   ```

3. **Push to Private Repo:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

### For Website Updates (Public):

1. **Make Changes:**
   ```bash
   cd C:\Auto-Complete-Project\website
   # Edit files as needed
   ```

2. **Test Locally:**
   - Open `index.html` in browser
   - Check all links work

3. **Deploy to GitHub Pages:**
   ```bash
   git add .
   git commit -m "Update website"
   git push origin main
   # GitHub Pages auto-deploys in ~2 minutes
   ```

## 🔗 Linking Everything Together

### Update These Files Before Chrome Web Store Submission:

#### In Extension (Private Repo):
1. **manifest.json:**
   ```json
   {
     "homepage_url": "https://YOUR_USERNAME.github.io/ai-autocomplete-website/"
   }
   ```

2. **src/components/ConsentScreen.tsx:**
   ```typescript
   const PRIVACY_URL = "https://YOUR_USERNAME.github.io/ai-autocomplete-website/privacy.html";
   const TERMS_URL = "https://YOUR_USERNAME.github.io/ai-autocomplete-website/terms.html";
   ```

3. **src/popup/Popup.tsx:**
   - Add website link in footer
   - Update support URLs

#### In Website (Public Repo):
1. **All HTML files:**
   - Chrome Web Store URL (when available)
   - Support email
   - GitHub repo link (link to public website repo, not private extension repo)

## 📦 Chrome Web Store Submission

### Build Extension for Submission:
```bash
cd ai-autocomplete-ext
npm run build
# Create zip file of dist folder
# Upload to Chrome Developer Dashboard
```

### Required URLs:
- ✅ Homepage: `https://YOUR_USERNAME.github.io/ai-autocomplete-website/`
- ✅ Privacy Policy: `https://YOUR_USERNAME.github.io/ai-autocomplete-website/privacy.html`
- ✅ Terms of Service: `https://YOUR_USERNAME.github.io/ai-autocomplete-website/terms.html`
- ✅ Support URL: `https://github.com/YOUR_USERNAME/ai-autocomplete-website/issues`

## 🛡️ Security Best Practices

### For Private Extension Repo:
- ✅ Never commit API keys
- ✅ Use `.gitignore` for sensitive files
- ✅ Keep `node_modules` out of git
- ✅ Use environment variables for configs
- ✅ Regular security audits with `npm audit`

### For Public Website Repo:
- ✅ No sensitive information
- ✅ No API keys or secrets
- ✅ Only marketing/documentation content
- ✅ Regular dependency updates

## 📝 Maintaining Both Repos

### Weekly Tasks:
1. Update extension based on user feedback (private)
2. Update website with new features/changelog (public)
3. Monitor GitHub Pages status
4. Check for security advisories

### Before Each Release:
1. Update version in `manifest.json`
2. Update changelog on website
3. Test extension thoroughly
4. Update website screenshots if UI changed
5. Tag release in private repo
6. Update public website

## 🔄 Git Workflow Example

### Working on Extension:
```bash
# Start from main project
cd C:\Auto-Complete-Project

# Work on extension
cd ai-autocomplete-ext
# ... make changes ...
git add .
git commit -m "Feature: Add new completion mode"
git push

# Update website if needed
cd ../website
# ... update feature list ...
git add .
git commit -m "Update features for new completion mode"
git push
```

## 💡 Pro Tips

1. **Use GitHub Actions** in private repo for automated testing
2. **Use GitHub Pages** custom domain for professional look
3. **Keep repos in sync** - version numbers should match
4. **Document everything** in private repo
5. **Market openly** in public repo

## 🚨 Important Reminders

- **NEVER** accidentally push extension source to public repo
- **ALWAYS** test website after pushing (GitHub Pages can have delays)
- **KEEP** Privacy Policy and Terms updated in public repo
- **UPDATE** all URLs before Chrome Web Store submission
- **BACKUP** both repositories regularly

## 📊 Success Metrics

Track these in both repos:
- Private Repo: Development velocity, bug fixes, feature completion
- Public Repo: Website traffic (via GitHub Insights), user engagement
- Combined: Chrome Web Store reviews, user feedback

---

**Remember:** The separation of private extension code and public website gives you the best of both worlds - protected intellectual property and transparent user-facing documentation!