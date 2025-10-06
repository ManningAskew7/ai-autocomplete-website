# AI Autocomplete Website

Official website for the AI Autocomplete Chrome Extension - providing intelligent text predictions powered by AI.

🌐 **Live Site:** [Coming Soon - Will be at https://[yourusername].github.io/ai-autocomplete-website]

## 📋 Overview

This is the public-facing website for AI Autocomplete, a Chrome extension that brings AI-powered text completion to any webpage. The website includes:

- **Landing Page** - Product features, pricing, and demo
- **Privacy Policy** - GDPR/CCPA compliant privacy documentation  
- **Terms of Service** - Legal terms and usage guidelines
- **Professional Design** - Minimalist black/grey/white theme matching the extension UI

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

```
ai-autocomplete-website/
├── index.html          # Main landing page
├── privacy.html        # Privacy Policy page
├── terms.html          # Terms of Service page
├── test.html           # Test page with links to all sections
├── README.md           # This file
├── css/
│   ├── styles.css      # Main stylesheet
│   └── legal.css       # Legal pages specific styles
├── js/
│   └── main.js         # Interactive features and animations
└── assets/
    ├── logo.svg        # SVG logo (needs updating)
    └── logo-original.jpg # Original JPG logo
```

## 🔧 Updating the Website

### Making Changes

1. Edit files locally
2. Test changes by opening `index.html` in your browser
3. Push updates to GitHub:
   ```bash
   git add .
   git commit -m "Describe your changes"
   git push
   ```
4. GitHub Pages auto-updates in 1-2 minutes

### Important Files to Update

Before going live with the Chrome extension, update these placeholders:

1. **All HTML files:**
   - Replace `[Your repository URL]` with actual GitHub repo
   - Replace `[Your support email]` with actual email
   - Update Chrome Web Store URL when available

2. **index.html:**
   - Line 34: Update Chrome Web Store URL
   - Line 294: Update GitHub repository URL
   - Line 312: Update support email

3. **privacy.html & terms.html:**
   - Update contact information sections
   - Update jurisdiction in Terms of Service

## 🎨 Customization Guide

### Logo Update
The SVG logo (`assets/logo.svg`) needs refinement. To update:
1. Replace `assets/logo.svg` with your improved version
2. Ensure it works on dark backgrounds
3. Keep the minimalist black/white aesthetic

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

## 🔗 Connecting to Chrome Extension

Once your website is live, update your Chrome extension:

### Extension Files to Update:

1. **manifest.json:**
   ```json
   "homepage_url": "https://YOUR_USERNAME.github.io/ai-autocomplete-website/"
   ```

2. **Privacy consent screen:**
   - Update privacy policy URL
   - Update terms of service URL

3. **Extension popup:**
   - Add link to website

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

### Before Chrome Web Store Submission:
- [ ] Update all placeholder URLs
- [ ] Update contact information
- [ ] Improve SVG logo
- [ ] Add actual demo video/screenshots
- [ ] Test all links
- [ ] Verify Privacy Policy completeness
- [ ] Verify Terms of Service completeness
- [ ] Test on mobile devices

### Regular Updates:
- [ ] Keep privacy policy current
- [ ] Update feature list as extension evolves
- [ ] Add user testimonials
- [ ] Update pricing if changed
- [ ] Add FAQ section based on user questions

## 💡 Future Enhancements

Placeholder sections ready for:
- Demo video integration
- Newsletter signup form
- User testimonials/reviews
- FAQ section
- Blog/updates section
- Download statistics
- Advertisement zones

## 📄 License

This website is part of the AI Autocomplete Chrome Extension project.

## 🤝 Support

For issues or questions about the website:
1. Open an issue in this repository
2. Contact: [Your support email]

---

**Note:** The Chrome extension source code is maintained in a separate private repository. This public repository contains only the website files.