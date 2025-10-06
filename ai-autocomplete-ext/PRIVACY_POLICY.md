# Privacy Policy - AI Autocomplete Chrome Extension

**Last Updated:** August 2025  
**Version:** 1.0.0

## Introduction

AI Autocomplete ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Chrome browser extension.

## Information We Process

### 1. Text Data (On-Demand Only)

**What We Process:**
- Text you are typing in input fields (only when you press Ctrl+Space or your configured trigger key)
- Selected/highlighted text for context (not yet but to be implemented)
- Current page URL to provide relevant suggestions (not yet but to be implemented)

**When We Process It:**
- ONLY when you explicitly trigger the autocomplete feature
- Never automatically or in the background
- Password fields and payment forms are automatically excluded

**How We Use It:**
- Sent to OpenRouter API to generate AI completions
- Processed in real-time
- Never stored permanently on our servers or third-party servers
- Deleted from memory immediately after generating suggestions

### 2. Extension Settings

**What We Store Locally (your browser):**
- Your OpenRouter API key (encrypted in Chrome sync storage)
- Selected AI model preferences
- Temperature and token settings
- Custom system prompts (premium feature)
- Keyboard shortcuts preferences
- Privacy preferences (enhanced detection on/off, injection mode)

**How We Use It:**
- To remember your preferences across browser sessions
- To authenticate with OpenRouter API
- Never transmitted except API key to OpenRouter for authentication

### 3. Usage Analytics (Optional)

**What We May Collect (If Enabled):**
- Anonymous usage statistics (feature usage frequency)
- Error reports for debugging
- No personally identifiable information

**How We Use It:**
- To improve the extension's functionality
- To fix bugs and issues
- To understand which features are most valuable

## Data Sharing

### Third-Party Services

**OpenRouter AI:**
- We send your text data to OpenRouter ONLY when you trigger autocomplete
- OpenRouter processes the text according to their privacy policy
- We do not control how OpenRouter handles data once received
- Review OpenRouter's privacy policy at: https://openrouter.ai/privacy

**ExtensionPay (Premium Users Only):**
- Handles payment processing for premium subscriptions (todo)
- We do not store credit card information
- Payment data is processed according to ExtensionPay's privacy policy

### We Never:
- Sell your data to third parties
- Share your data for advertising purposes
- Store your typed text permanently
- Access your browsing history beyond the current tab

## Data Security

We implement security measures including:
- Encryption of stored API keys
- HTTPS-only communication with APIs
- Content Security Policy to prevent XSS attacks
- User choice of injection aggression
- Minimal permission model (only essential Chrome APIs)
- Automatic exclusion of sensitive form fields

## Your Rights

### You Can:
- **Access Your Data:** Export all stored settings via the extension
- **Delete Your Data:** Clear all data through extension settings or by uninstalling
- **Opt-Out:** Disable enhanced detection (keyboard buffer) at any time
- **Control Collection:** Text is only processed when you explicitly trigger it
- **Revoke Consent:** Uninstall the extension to stop all data processing

### Data Deletion:
- All local data is deleted when you uninstall the extension
- No data is retained on our servers (we don't have servers)
- API providers may retain data according to their policies

## Children's Privacy

This extension is not intended for users under 13 years of age. We do not knowingly collect information from children under 13.

## International Users

This extension is available globally. By using it, you consent to the processing of your information in the United States and other countries where OpenRouter operates.

## Chrome Web Store Compliance

This extension complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. We only use the minimum permissions necessary for functionality.

### Permissions Used:
- `storage`: Save your preferences
- `activeTab`: Access current tab for text extraction
- `scripting`: Inject autocomplete functionality
- `https://openrouter.ai/*`: Communicate with AI service

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Updating the "Last Updated" date
- Showing a notification in the extension
- Requiring re-consent for significant changes

## Contact Information

For privacy concerns or questions, please contact us at:
- GitHub Issues: [Your repository URL]/issues
- Email: [Your support email]

## Consent

By installing and using AI Autocomplete, you consent to this Privacy Policy and agree to its terms.

## Additional Disclosures

### Fallback Detection Mode
When enabled, the fallback detection mode uses a keyboard buffer to capture text input on websites where standard detection fails. This feature:
- Is OFF by default
- Requires explicit opt-in with clear warning
- Shows a red indicator when active
- Clears buffer on navigation and after 5 minutes of inactivity
- Can be disabled at any time in Privacy settings

### Data Retention
- **Local Storage:** Settings retained until you delete them
- **Session Data:** Cleared when browser closes
- **Text Buffer:** Cleared immediately after use or within 5 minutes
- **API Logs:** Subject to OpenRouter's retention policy

### GDPR Compliance (EU Users)
- **Legal Basis:** Consent (you explicitly trigger data processing)
- **Data Controller:** You, the user
- **Data Processor:** OpenRouter AI
- **Right to Erasure:** Uninstall extension or clear storage
- **Data Portability:** Export feature available in settings

### CCPA Compliance (California Users)
- We do not sell personal information
- You have the right to opt-out of data collection (via settings)
- You have the right to request deletion (via uninstall)
- No discrimination for exercising privacy rights

---

**Remember:** You are in control. The extension only processes text when you explicitly request it, and you can adjust privacy settings or uninstall at any time.