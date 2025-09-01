import { logger } from './content-logger';
import { detectTextElement, getActiveTextElement, findAllTextElements, getSelectedText, type TextElement } from './universal-detector';

// Prevent multiple injections
(() => {
  if ((window as any).__aiAutocompleteInjected) {
    console.log('[AI Autocomplete] Already injected on this page, skipping...');
    return;
  }
  (window as any).__aiAutocompleteInjected = true;

// Identify which frame this is running in
const frameInfo = window === window.top ? 'MAIN FRAME' : `IFRAME (${window.location.href})`;
logger.log(`🚀 AI Autocomplete content script loaded successfully! [${frameInfo}]`);

// Check for user consent before initializing
async function checkConsent(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(['privacySettings']);
    const settings = result.privacySettings;
    return settings?.hasConsented === true;
  } catch (error) {
    logger.error('Error checking consent:', error);
    return false;
  }
}

// Initialize only if consent is given
checkConsent().then(hasConsent => {
  if (!hasConsent) {
    logger.log('⚠️ User has not consented, content script will not initialize');
    return;
  }
  
  logger.log('✅ User has consented, initializing AI Autocomplete features...');
  initializeAutocomplete();
});

// Main initialization function
function initializeAutocomplete() {

// Keyboard Buffer Class for Enhanced Text Detection
class KeyboardBuffer {
  private buffer: string = '';
  private readonly maxSize: number = 300;
  private enabled: boolean = false;
  private inactivityTimer: number | null = null;
  private indicatorElement: HTMLElement | null = null;

  constructor() {
    // Check if enhanced detection is enabled on startup
    chrome.storage.sync.get(['enhancedDetection'], (result) => {
      if (result.enhancedDetection) {
        this.enable();
      }
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.enhancedDetection) {
        if (changes.enhancedDetection.newValue) {
          this.enable();
        } else {
          this.disable();
        }
      }
    });
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.attachListeners();
    this.showIndicator();
    this.startInactivityTimer();
    
    logger.log('🔴 Enhanced text detection enabled (keylogger active)');
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.detachListeners();
    this.hideIndicator();
    this.clearBuffer();
    this.stopInactivityTimer();
    
    logger.log('⚪ Enhanced text detection disabled');
  }

  private attachListeners() {
    // Capture at document level, before any site handlers
    document.addEventListener('keypress', this.handleKeypress, true);
    document.addEventListener('paste', this.handlePaste, true);
    document.addEventListener('beforeunload', this.handlePageUnload);
  }

  private detachListeners() {
    document.removeEventListener('keypress', this.handleKeypress, true);
    document.removeEventListener('paste', this.handlePaste, true);
    document.removeEventListener('beforeunload', this.handlePageUnload);
  }

  private handleKeypress = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    
    // Skip if target is a password or credit card field
    const target = e.target as HTMLInputElement;
    if (target && target.tagName === 'INPUT') {
      const type = target.type?.toLowerCase();
      const autocomplete = target.autocomplete?.toLowerCase();
      
      if (type === 'password' || 
          autocomplete?.includes('cc-') || 
          autocomplete === 'credit-card') {
        return;
      }
    }
    
    // Only track printable characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.addToBuffer(e.key);
      this.updateActivity();
    }
    
    // Track Enter as newline
    if (e.key === 'Enter') {
      this.addToBuffer('\n');
      this.updateActivity();
    }
    
    // Track backspace to remove last character
    if (e.key === 'Backspace' && this.buffer.length > 0) {
      this.buffer = this.buffer.slice(0, -1);
      this.updateActivity();
    }
  };

  private handlePaste = (e: ClipboardEvent) => {
    if (!this.enabled) return;
    
    const pastedText = e.clipboardData?.getData('text');
    if (pastedText) {
      this.addToBuffer(pastedText);
      this.updateActivity();
    }
  };

  private handlePageUnload = () => {
    this.clearBuffer();
  };

  private addToBuffer(text: string) {
    this.buffer += text;
    // Keep only last N characters
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
    logger.log(`📝 Buffer updated: ${this.buffer.length} chars`);
  }

  private clearBuffer() {
    this.buffer = '';
    logger.log('🗑️ Buffer cleared');
  }

  private updateActivity() {
    this.startInactivityTimer();
  }

  private startInactivityTimer() {
    this.stopInactivityTimer();
    
    // Clear buffer after 5 minutes of inactivity
    this.inactivityTimer = window.setTimeout(() => {
      this.clearBuffer();
      logger.log('⏰ Buffer cleared due to inactivity');
    }, 5 * 60 * 1000);
  }

  private stopInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private showIndicator() {
    if (this.indicatorElement) return;
    
    this.indicatorElement = document.createElement('div');
    this.indicatorElement.id = 'ai-autocomplete-keylogger-indicator';
    this.indicatorElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999998;
      transition: all 0.2s ease;
    `;
    
    // Add pulsing red dot
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 12px;
      height: 12px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 2s infinite;
    `;
    
    // Add animation styles
    if (!document.getElementById('ai-autocomplete-keylogger-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-autocomplete-keylogger-styles';
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        #ai-autocomplete-keylogger-indicator:hover {
          transform: scale(1.1);
        }
        #ai-autocomplete-keylogger-indicator::after {
          content: 'Enhanced detection active. Click to disable.';
          position: absolute;
          bottom: 100%;
          right: 0;
          background: #333;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          margin-bottom: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }
        #ai-autocomplete-keylogger-indicator:hover::after {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    this.indicatorElement.appendChild(dot);
    
    // Click to disable
    this.indicatorElement.onclick = () => {
      if (confirm('Disable enhanced text detection? You can re-enable it from the extension settings.')) {
        chrome.storage.sync.set({ enhancedDetection: false });
      }
    };
    
    document.body.appendChild(this.indicatorElement);
  }

  private hideIndicator() {
    if (this.indicatorElement) {
      this.indicatorElement.remove();
      this.indicatorElement = null;
    }
  }

  getBuffer(): string {
    return this.buffer;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
  
  // Method to add accepted completions to the buffer
  appendToBuffer(text: string) {
    if (this.enabled) {
      this.addToBuffer(text);
      logger.log('✅ AI completion added to buffer');
    }
  }
}

// Initialize keyboard buffer
const keyboardBuffer = new KeyboardBuffer();

// Enhanced Text Extraction System
class TextExtractionManager {
  private lastFocusedElement: HTMLElement | null = null;
  private lastInputContent: Map<HTMLElement, string> = new Map();
  
  constructor() {
    this.setupListeners();
  }
  
  private setupListeners() {
    // Global input event listener - captures ALL text changes
    document.addEventListener('input', this.handleInputEvent, true);
    document.addEventListener('beforeinput', this.handleBeforeInputEvent, true);
    
    // Focus event listeners - handles field switching
    document.addEventListener('focusin', this.handleFocusIn, true);
    document.addEventListener('focus', this.handleFocusIn, true);
  }
  
  private handleInputEvent = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    
    // Store the latest content from any input
    const content = this.extractTextFromElement(target);
    if (content) {
      this.lastInputContent.set(target, content);
      logger.log(`📝 Input event captured: ${content.length} chars`);
    }
  };
  
  private handleBeforeInputEvent = (e: Event) => {
    // Capture text before changes for better context
    const target = e.target as HTMLElement;
    if (!target) return;
    
    const content = this.extractTextFromElement(target);
    if (content) {
      this.lastInputContent.set(target, content);
    }
  };
  
  private handleFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    
    // Update last focused element
    this.lastFocusedElement = target;
    
    // Extract and store text from newly focused element
    const content = this.extractTextFromElement(target);
    if (content) {
      this.lastInputContent.set(target, content);
      logger.log(`🎯 Focus changed, extracted: ${content.length} chars`);
    }
  };
  
  private extractTextFromElement(element: HTMLElement): string {
    // Try various methods to extract text
    if ('value' in element) {
      return (element as HTMLInputElement | HTMLTextAreaElement).value || '';
    }
    if (element.isContentEditable || element.contentEditable === 'true') {
      return element.innerText || element.textContent || '';
    }
    // For other elements
    return element.textContent || element.innerText || '';
  }
  
  // Get text from the most recently active element
  getLastActiveText(): string | null {
    // First try the currently focused element
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      const text = this.extractTextFromElement(activeElement);
      if (text) {
        logger.log('✅ Got text from active element');
        return text;
      }
    }
    
    // Then try the last focused element
    if (this.lastFocusedElement) {
      const text = this.lastInputContent.get(this.lastFocusedElement);
      if (text) {
        logger.log('✅ Got text from last focused element');
        return text;
      }
    }
    
    // Finally, try to get the most recent input from any element
    if (this.lastInputContent.size > 0) {
      const entries = Array.from(this.lastInputContent.entries());
      const mostRecent = entries[entries.length - 1];
      if (mostRecent && mostRecent[1]) {
        logger.log('✅ Got text from recent input');
        return mostRecent[1];
      }
    }
    
    return null;
  }
  
  // Clear stored data for privacy
  clearCache() {
    this.lastInputContent.clear();
    this.lastFocusedElement = null;
  }
}

// Initialize text extraction manager
const textExtractionManager = new TextExtractionManager();

// Type definitions
type CompletionMode = 'short' | 'medium' | 'long';

// Keybind Management System
interface Keybinds {
  trigger: string;
  accept: string;
  cycle: string;
  dismiss: string;
  manualInject: string; // New keybind for manual injection
  rewrite: string; // Keybind for rewriting selected text
}

class KeybindManager {
  private keybinds: Keybinds = {
    trigger: 'ctrl+space',
    accept: 'arrowright',
    cycle: 'tab',
    dismiss: 'escape',
    manualInject: 'ctrl+shift+space', // Default manual injection keybind
    rewrite: 'alt+shift+r' // Default rewrite keybind (Alt+Shift+R)
  };
  
  constructor() {
    this.loadKeybinds();
    
    // Listen for keybind changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.keybinds) {
        this.keybinds = changes.keybinds.newValue || this.getDefaultKeybinds();
        logger.log('⌨️ Keybinds updated:', this.keybinds);
      }
    });
  }
  
  private getDefaultKeybinds(): Keybinds {
    return {
      trigger: 'ctrl+space',
      accept: 'arrowright',
      cycle: 'tab', 
      dismiss: 'escape',
      manualInject: 'ctrl+shift+space',
      rewrite: 'alt+shift+r'
    };
  }
  
  private loadKeybinds() {
    chrome.storage.sync.get(['keybinds'], (result) => {
      if (result.keybinds) {
        // Merge with defaults to ensure all keys exist (for backward compatibility)
        this.keybinds = { ...this.getDefaultKeybinds(), ...result.keybinds };
        logger.log('⌨️ Loaded custom keybinds:', this.keybinds);
      } else {
        logger.log('⌨️ Using default keybinds');
      }
    });
  }
  
  matchesKeybind(event: KeyboardEvent, action: keyof Keybinds): boolean {
    const binding = this.keybinds[action];
    if (!binding) {
      // If keybind is undefined, use default
      const defaults = this.getDefaultKeybinds();
      this.keybinds[action] = defaults[action];
      logger.warn(`⚠️ Keybind for '${action}' was undefined, using default: ${defaults[action]}`);
      return false;
    }
    const bindingLower = binding.toLowerCase();
    
    // Parse the keybind string
    const parts = bindingLower.split('+');
    const key = parts[parts.length - 1];
    const hasCtrl = parts.includes('ctrl');
    const hasShift = parts.includes('shift');
    const hasAlt = parts.includes('alt');
    const hasMeta = parts.includes('meta') || parts.includes('cmd');
    
    // Check modifiers
    if (hasCtrl !== event.ctrlKey) return false;
    if (hasShift !== event.shiftKey) return false;
    if (hasAlt !== event.altKey) return false;
    if (hasMeta !== event.metaKey) return false;
    
    // Check the main key
    const eventKey = event.key.toLowerCase();
    const eventCode = event.code.toLowerCase();
    
    // Handle special keys
    if (key === 'space' && eventCode === 'space') return true;
    if (key === 'tab' && eventKey === 'tab') return true;
    if (key === 'enter' && eventKey === 'enter') return true;
    if (key === 'escape' && eventKey === 'escape') return true;
    if (key === 'arrowright' && eventKey === 'arrowright') return true;
    if (key === 'arrowleft' && eventKey === 'arrowleft') return true;
    if (key === 'arrowup' && eventKey === 'arrowup') return true;
    if (key === 'arrowdown' && eventKey === 'arrowdown') return true;
    
    // Handle regular keys
    if (key === eventKey) return true;
    
    // Handle period/dot
    if (key === '.' && eventKey === '.') return true;
    if (key === 'period' && eventKey === '.') return true;
    
    return false;
  }
  
  getKeybindDisplay(action: keyof Keybinds): string {
    const binding = this.keybinds[action];
    // Convert to display format
    const parts = binding.split('+').map(part => {
      const p = part.toLowerCase();
      if (p === 'ctrl') return 'Ctrl';
      if (p === 'shift') return 'Shift';
      if (p === 'alt') return 'Alt';
      if (p === 'meta' || p === 'cmd') return 'Cmd';
      if (p === 'arrowright') return '→';
      if (p === 'arrowleft') return '←';
      if (p === 'arrowup') return '↑';
      if (p === 'arrowdown') return '↓';
      if (p === 'space') return 'Space';
      if (p === 'tab') return 'Tab';
      if (p === 'enter') return 'Enter';
      if (p === 'escape') return 'Esc';
      if (p === 'period' || p === '.') return '.';
      return part.charAt(0).toUpperCase() + part.slice(1);
    });
    return parts.join('+');
  }
  
  getKeybinds(): Keybinds {
    return this.keybinds;
  }
}

// Initialize keybind manager
const keybindManager = new KeybindManager();

// Completion Mode Manager
class CompletionModeManager {
  private currentMode: CompletionMode = 'short';
  private modeIndicatorElement: HTMLElement | null = null;
  private indicatorTimeout: number | null = null;
  
  constructor() {
    this.loadMode();
  }
  
  private loadMode() {
    chrome.storage.sync.get(['completionMode'], (result) => {
      if (result.completionMode) {
        this.currentMode = result.completionMode;
        logger.log('📝 Loaded completion mode:', this.currentMode);
      }
    });
  }
  
  getMode(): CompletionMode {
    return this.currentMode;
  }
  
  cycleMode() {
    const modes: CompletionMode[] = ['short', 'medium', 'long'];
    const currentIndex = modes.indexOf(this.currentMode);
    this.currentMode = modes[(currentIndex + 1) % modes.length];
    
    // Save to storage
    chrome.storage.sync.set({ completionMode: this.currentMode });
    
    // Show indicator
    this.showModeIndicator();
    
    logger.log('🔄 Switched to mode:', this.currentMode);
    return this.currentMode;
  }
  
  showModeIndicator(duration: number = 2000) {
    // Remove existing indicator
    this.hideModeIndicator();
    
    this.modeIndicatorElement = document.createElement('div');
    this.modeIndicatorElement.id = 'ai-autocomplete-mode-indicator';
    this.modeIndicatorElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      animation: fadeIn 0.2s ease-out;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    // Add mode icon
    const icon = document.createElement('span');
    icon.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${this.getModeColor()};
    `;
    
    // Add mode text
    const text = document.createElement('span');
    text.textContent = `${this.getModeLabel()} Mode`;
    
    this.modeIndicatorElement.appendChild(icon);
    this.modeIndicatorElement.appendChild(text);
    
    // Add fade animation if not present
    if (!document.getElementById('ai-mode-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-mode-indicator-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(this.modeIndicatorElement);
    
    // Auto-hide after duration
    this.indicatorTimeout = window.setTimeout(() => {
      this.hideModeIndicator();
    }, duration);
  }
  
  private hideModeIndicator() {
    if (this.indicatorTimeout) {
      clearTimeout(this.indicatorTimeout);
      this.indicatorTimeout = null;
    }
    
    if (this.modeIndicatorElement) {
      this.modeIndicatorElement.style.opacity = '0';
      this.modeIndicatorElement.style.transition = 'opacity 0.2s';
      setTimeout(() => {
        this.modeIndicatorElement?.remove();
        this.modeIndicatorElement = null;
      }, 200);
    }
  }
  
  private getModeLabel(): string {
    switch (this.currentMode) {
      case 'short': return 'Short';
      case 'medium': return 'Medium';
      case 'long': return 'Long';
      default: return 'Short';
    }
  }
  
  private getModeColor(): string {
    switch (this.currentMode) {
      case 'short': return '#10b981'; // Green
      case 'medium': return '#3b82f6'; // Blue
      case 'long': return '#8b5cf6'; // Purple
      default: return '#10b981';
    }
  }
}

// Initialize mode manager
const completionModeManager = new CompletionModeManager();

// Add a data attribute to indicate the extension is loaded (for detection by pages)
document.body.setAttribute('data-ai-autocomplete-extension', 'loaded');

// Check if we're on Google Docs or other canvas-based sites
const canvasBasedSites = [
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com'
];

const completelyUnsupportedSites = [
  'drive.google.com' // Google Drive file browser - no text editing at all
];

// Flag to track if we're on a canvas-based site
let isCanvasBasedSite = false;

// Check if completely unsupported (exit completely)
if (completelyUnsupportedSites.some(site => window.location.hostname.includes(site))) {
  logger.log('⚠️ AI Autocomplete is completely disabled on this site');
  throw new Error('Completely unsupported site');
}

// Check if canvas-based site (allow rewrite but not autocomplete)
if (canvasBasedSites.some(site => window.location.hostname.includes(site))) {
  isCanvasBasedSite = true;
  logger.log('📝 Canvas-based site detected (Google Docs/Sheets/Slides)');
  logger.log('✅ Rewrite feature (selected text) will work');
  logger.log('⚠️ Autocomplete feature is disabled due to canvas rendering');
  
  // Show a notice about partial functionality
  const notice = document.createElement('div');
  notice.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 999999;
    opacity: 0.95;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  notice.innerHTML = `
    <strong>AI Autocomplete:</strong> Limited support on ${window.location.hostname}
    <br><span style="font-size: 11px; opacity: 0.9;">⚠️ This site uses canvas-based rendering</span>
    <br><span style="font-size: 11px; opacity: 0.9;">🚀 Full support coming soon!</span>
  `;
  document.body.appendChild(notice);
  setTimeout(() => {
    notice.style.opacity = '0';
    notice.style.transition = 'opacity 0.3s';
    setTimeout(() => notice.remove(), 300);
  }, 5000);
}

// Add a heartbeat check to detect when extension context is lost
let extensionAlive = true;
const checkExtensionHealth = () => {
  if (chrome?.runtime?.id) {
    // Extension is still alive
    extensionAlive = true;
  } else {
    // Extension context lost
    extensionAlive = false;
    logger.warn('⚠️ AI Autocomplete extension context lost. Please reload the page.');
    
    // Show persistent notification
    if (!document.querySelector('#ai-autocomplete-reload-notice')) {
      const notice = document.createElement('div');
      notice.id = 'ai-autocomplete-reload-notice';
      notice.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f59e0b;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        cursor: pointer;
      `;
      notice.innerHTML = '⚠️ AI Autocomplete needs reload<br><small>Click here or press F5</small>';
      notice.onclick = () => window.location.reload();
      document.body.appendChild(notice);
    }
  }
};

// Check every 5 seconds
setInterval(checkExtensionHealth, 5000);

// Add visual indicator that extension is active (only on supported sites)
const indicator = document.createElement('div');
indicator.innerHTML = '✨ AI Autocomplete Active';
indicator.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #4CAF50;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-family: Arial, sans-serif;
  font-size: 12px;
  z-index: 999999;
  opacity: 0.9;
  transition: opacity 0.3s;
`;
document.body.appendChild(indicator);
setTimeout(() => indicator.style.opacity = '0', 3000);
setTimeout(() => indicator.remove(), 3500);

// Helper functions for platform-specific element detection (kept for future use)
/* 
function findGoogleDocsInput(): HTMLElement | null {
  // Try multiple selectors for Google Docs input
  const selectors = [
    'div[role="textbox"][contenteditable="true"]',  // Main document content area
    '.docs-texteventtarget-iframe',                  // Hidden iframe for text input
    'iframe.docs-texteventtarget-iframe',            // Alternative iframe selector
    '.kix-appview-editor',                           // Editor container
    '[contenteditable="true"]'                       // Fallback to any contenteditable
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      logger.log('Found Google Docs input element:', selector);
      return element;
    }
  }
  
  // Try to find iframe document
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = (iframe as HTMLIFrameElement).contentDocument;
      if (iframeDoc?.body?.contentEditable === 'true') {
        logger.log('Found Google Docs iframe body');
        return iframeDoc.body;
      }
    } catch (e) {
      // Cross-origin or inaccessible iframe
    }
  }
  
  return null;
}

function findGmailComposeArea(): HTMLElement | null {
  // Try different selectors for Gmail's compose area
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',     // New compose
    'div[g_editable="true"]',                          // Legacy Gmail
    'div.editable',                                     // Alternative
    'div.Am',                                           // Message body class
    'div.Ar.Au > div > div',                           // Nested compose area
    'div[aria-label*="Message Body"]'                  // Aria label search
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      logger.log('Found Gmail compose element:', selector);
      return element;
    }
  }
  
  // Check iframes in Gmail
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = (iframe as HTMLIFrameElement).contentDocument || 
                       (iframe as HTMLIFrameElement).contentWindow?.document;
      if (iframeDoc) {
        const editable = iframeDoc.querySelector('body[contenteditable="true"]') as HTMLElement;
        if (editable) {
          logger.log('Found Gmail iframe editable body');
          return editable;
        }
      }
    } catch (e) {
      // Cross-origin iframe, skip
    }
  }
  
  return null;
}
*/

// Ghost text overlay system
let ghostTextElement: HTMLElement | null = null;
let currentSuggestions: string[] = [];
let currentSuggestionIndex = 0;
let activeTextElement: TextElement | null = null;
let originalCursor: string = '';

// Set up MutationObserver to detect dynamically added elements
const setupMutationObserver = () => {
  const observer = new MutationObserver((mutations) => {
    // Check if any new text inputs were added
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            // Check if this element or its children are text inputs
            const textElement = detectTextElement(element);
            if (textElement) {
              logger.log('🆕 New text element detected:', textElement.type);
            }
            // Also check children
            element.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(child => {
              const childTextElement = detectTextElement(child as HTMLElement);
              if (childTextElement) {
                logger.log('🆕 New child text element detected:', childTextElement.type);
              }
            });
          }
        });
      }
      // Detect contenteditable attribute changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'contenteditable') {
        const element = mutation.target as HTMLElement;
        if (element.contentEditable === 'true') {
          logger.log('🔄 Element became editable');
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'role']
  });

  logger.log('👀 MutationObserver initialized for dynamic element detection');
};

// Initialize observer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMutationObserver);
} else {
  setupMutationObserver();
}

// Override attachShadow to monitor shadow DOM
const originalAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function(options) {
  const shadowRoot = originalAttachShadow.call(this, options);
  logger.log('🌑 Shadow root attached, monitoring for text inputs');
  
  // Set up observer for this shadow root
  const shadowObserver = new MutationObserver(() => {
    // Check for text inputs in shadow DOM
    const textElements = findAllTextElements();
    logger.log(`Found ${textElements.length} text elements including shadow DOM`);
  });
  
  shadowObserver.observe(shadowRoot as unknown as Node, {
    childList: true,
    subtree: true
  });
  
  return shadowRoot;
};

function createGhostText(textElement: TextElement, suggestions: string[], index: number = 0) {
  // Remove any existing ghost text
  removeGhostText();
  
  // Store references
  activeTextElement = textElement;
  currentSuggestions = suggestions;
  currentSuggestionIndex = index;
  
  const suggestion = suggestions[index];
  const element = textElement.element;
  
  // Get the current text
  const currentText = (element as HTMLTextAreaElement).value || 
                     (element as HTMLInputElement).value || 
                     element.innerText || '';
  
  // Create ghost text element
  ghostTextElement = document.createElement('span');
  ghostTextElement.className = 'ai-autocomplete-ghost';
  ghostTextElement.textContent = suggestion;
  ghostTextElement.style.cssText = `
    position: absolute;
    color: #999;
    pointer-events: none;
    white-space: pre-wrap;
    opacity: 0.7;
    z-index: 10000;
  `;
  
  // Copy styles from the original element
  const computedStyle = window.getComputedStyle(element);
  const stylesToCopy = [
    'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-transform'
  ];
  
  stylesToCopy.forEach(style => {
    (ghostTextElement as HTMLElement).style[style as any] = computedStyle[style as any];
  });
  
  // Position the ghost text
  if (element.tagName === 'INPUT') {
    // For input fields, create an inline ghost text
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: 100%;
    `;
    
    element.parentNode?.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    wrapper.appendChild(ghostTextElement);
    
    // Position after the current text
    const textWidth = getTextWidth(currentText, computedStyle);
    ghostTextElement.style.left = `${textWidth + parseInt(computedStyle.paddingLeft)}px`;
    ghostTextElement.style.top = `${parseInt(computedStyle.paddingTop)}px`;
    
  } else {
    // For textareas and contenteditable
    const rect = element.getBoundingClientRect();
    
    // Create ghost div that overlays the textarea
    const ghostDiv = document.createElement('div');
    ghostDiv.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      padding: ${computedStyle.padding};
      margin: 0;
      border: ${computedStyle.borderWidth} solid transparent;
      box-sizing: ${computedStyle.boxSizing};
      font-family: ${computedStyle.fontFamily};
      font-size: ${computedStyle.fontSize};
      font-weight: ${computedStyle.fontWeight};
      font-style: ${computedStyle.fontStyle};
      line-height: ${computedStyle.lineHeight};
      letter-spacing: ${computedStyle.letterSpacing};
      text-transform: ${computedStyle.textTransform};
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow: visible;
      pointer-events: none;
      z-index: 10000;
    `;
    
    // Add invisible text to position correctly
    const invisibleText = document.createElement('span');
    invisibleText.style.visibility = 'hidden';
    invisibleText.textContent = currentText;
    
    // Add the ghost suggestion
    const suggestionSpan = document.createElement('span');
    suggestionSpan.style.cssText = `
      color: #999;
      opacity: 0.7;
    `;
    suggestionSpan.textContent = suggestion;
    
    ghostDiv.appendChild(invisibleText);
    ghostDiv.appendChild(suggestionSpan);
    
    // Handle scrolling for textareas
    if (element.tagName === 'TEXTAREA') {
      const textarea = element as HTMLTextAreaElement;
      ghostDiv.scrollTop = textarea.scrollTop;
      
      // Add padding adjustment for scroll
      const paddingTop = parseInt(computedStyle.paddingTop);
      const scrollOffset = textarea.scrollTop;
      ghostDiv.style.paddingTop = `${paddingTop - scrollOffset}px`;
    }
    
    document.body.appendChild(ghostDiv);
    ghostTextElement = ghostDiv;
  }
  
  // Show instruction
  showInstruction();
}

function getTextWidth(text: string, style: CSSStyleDeclaration): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;
  
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText(text).width;
}

function removeGhostText() {
  if (ghostTextElement) {
    // Check if we created a wrapper (for input fields)
    const wrapper = ghostTextElement.parentElement;
    if (wrapper && wrapper.style.position === 'relative' && activeTextElement) {
      // Move the input back to its original position
      wrapper.parentNode?.insertBefore(activeTextElement.element, wrapper);
      wrapper.remove();
    } else {
      ghostTextElement.remove();
    }
    ghostTextElement = null;
  }
  hideInstruction();
}

// Clipboard-based insertion as a fallback method
async function insertViaClipboard(text: string): Promise<boolean> {
  try {
    // Copy suggestion to clipboard
    await navigator.clipboard.writeText(text);
    logger.log('📋 Copied to clipboard:', text.substring(0, 50) + '...');
    
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return false;
    
    activeElement.focus();
    
    // Method 1: For contenteditable elements, use insertText command
    if (activeElement.contentEditable === 'true') {
      const insertSuccess = document.execCommand('insertText', false, text);
      if (insertSuccess) {
        logger.log('✅ Inserted via execCommand insertText (contenteditable)');
        return true;
      }
    }
    
    // Method 2: For input/textarea, try paste command
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const pasteSuccess = document.execCommand('paste');
      if (pasteSuccess) {
        logger.log('✅ Pasted via execCommand paste (input/textarea)');
        return true;
      }
    }
    
    // If both methods failed, text is in clipboard for manual paste
    logger.log('⚠️ Auto-paste failed but text is in clipboard');
    return false;
  } catch (error) {
    logger.error('❌ Clipboard insertion failed:', error);
    return false;
  }
}

function acceptSuggestion() {
  if (!activeTextElement || currentSuggestions.length === 0) return;
  
  const suggestion = currentSuggestions[currentSuggestionIndex];
  
  // Add the accepted suggestion to the keyboard buffer for continuity
  keyboardBuffer.appendToBuffer(suggestion);
  
  // Get the text before insertion
  const textBefore = activeTextElement.getText();
  const lengthBefore = textBefore.length;
  
  // First try the universal insertText method
  try {
    activeTextElement.insertText(suggestion);
    
    // Verify the insertion worked by checking if text changed
    setTimeout(() => {
      if (!activeTextElement) return;
      const textAfter = activeTextElement.getText();
      const lengthAfter = textAfter.length;
      
      // Check if the text was actually inserted (text grew by at least 80% of suggestion length)
      const expectedMinGrowth = Math.floor(suggestion.length * 0.8);
      const actualGrowth = lengthAfter - lengthBefore;
      
      if (actualGrowth >= expectedMinGrowth) {
        logger.log(`✅ Suggestion accepted via insertText: ${suggestion}`);
        logger.log(`   Text grew by ${actualGrowth} chars (expected ~${suggestion.length})`);
      } else {
        logger.warn(`⚠️ InsertText may have failed. Growth: ${actualGrowth}, Expected: ${expectedMinGrowth}`);
        
        // Only try clipboard if we're really sure it failed (no growth at all)
        if (actualGrowth < 3) {
          logger.log('📋 Attempting clipboard fallback...');
          
          // Fallback to clipboard method
          insertViaClipboard(suggestion).then(success => {
            if (success) {
              logger.log('✅ Suggestion accepted via clipboard (after verification):', suggestion);
            } else {
              logger.error('❌ Both insertion methods failed');
              // Copy to clipboard for manual paste
              navigator.clipboard.writeText(suggestion).then(() => {
                logger.log('📋 Copied to clipboard for manual paste');
                showInstruction('Text copied to clipboard. Press Ctrl+V to paste.', 3000);
              });
            }
          });
        } else {
          logger.log('✅ Partial insertion detected, considering it successful');
        }
      }
    }, 100); // Slightly longer delay to ensure DOM updates
    
  } catch (error) {
    logger.warn('⚠️ InsertText threw error, trying clipboard method...');
    // Fallback to clipboard method
    insertViaClipboard(suggestion).then(success => {
      if (success) {
        logger.log('✅ Suggestion accepted via clipboard (after error):', suggestion);
      } else {
        logger.error('❌ Both insertion methods failed');
        // Copy to clipboard for manual paste
        navigator.clipboard.writeText(suggestion).then(() => {
          logger.log('📋 Copied to clipboard for manual paste');
          showInstruction('Text copied to clipboard. Press Ctrl+V to paste.', 3000);
        });
      }
    });
  }
  
  removeGhostText();
  logger.log(`📊 Selected option ${currentSuggestionIndex + 1} of ${currentSuggestions.length}`);
  logger.log(`📝 Attempted insert into ${activeTextElement.type} editor`);
}

// Handle completions when text was extracted via selection
function handleSelectionCompletion(suggestions: string[]) {
  // Store suggestions for cycling
  currentSuggestions = suggestions;
  currentSuggestionIndex = 0;
  
  // Mark that we're in selection mode (no active text element)
  activeTextElement = null;
  
  // Function to update clipboard and UI
  const updateSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    navigator.clipboard.writeText(suggestion).then(() => {
      logger.log(`✅ Suggestion ${index + 1} copied to clipboard`);
      // Add to keyboard buffer for continuity when user pastes
      keyboardBuffer.appendToBuffer(suggestion);
      
      // Update UI if it exists
      const floatingUI = document.getElementById('ai-autocomplete-selection-ui');
      if (floatingUI) {
        // Update the counter
        const titleElement = floatingUI.querySelector('div > div:first-child');
        if (titleElement && suggestions.length > 1) {
          titleElement.textContent = `Completion (${index + 1}/${suggestions.length})`;
        }
        
        // Update the preview text
        const preview = document.getElementById('ai-suggestion-preview');
        if (preview) {
          preview.textContent = `${suggestion.substring(0, 100)}${suggestion.length > 100 ? '...' : ''}`;
        }
      }
    });
  };
  
  // Copy first suggestion to clipboard
  updateSuggestion(0);
  
  // Show floating UI with suggestions - minimalistic design matching extension menu
  const floatingUI = document.createElement('div');
  floatingUI.id = 'ai-autocomplete-selection-ui';
  floatingUI.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    color: #333333;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    max-width: 420px;
    animation: slideUp 0.2s ease-out;
  `;
  
  // Add animation styles if not already added
  if (!document.getElementById('ai-autocomplete-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-autocomplete-animation-styles';
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(10px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  floatingUI.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="font-weight: 600; color: #111111; font-size: 14px;">
        Completion ${suggestions.length > 1 ? `(${currentSuggestionIndex + 1}/${suggestions.length})` : ''}
      </div>
    </div>
    <div id="ai-suggestion-preview" style="
      background: #f7f7f7;
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      color: #333333;
      font-size: 14px;
      line-height: 1.5;
      border: 1px solid #ebebeb;
    ">
      ${suggestions[0].substring(0, 100)}${suggestions[0].length > 100 ? '...' : ''}
    </div>
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px solid #ebebeb;
      font-size: 11px;
      color: #777777;
    ">
      <div>
        <span style="font-weight: 500;">${keybindManager.getKeybindDisplay('cycle')}:</span> Cycle${suggestions.length > 1 ? ' • ' : ''}
        <span style="font-weight: 500;">${keybindManager.getKeybindDisplay('accept')}:</span> Copy • 
        <span style="font-weight: 500;">${keybindManager.getKeybindDisplay('dismiss')}:</span> Dismiss
      </div>
    </div>
  `;
  
  document.body.appendChild(floatingUI);
  
  // Auto-remove after 60 seconds
  setTimeout(() => {
    if (document.getElementById('ai-autocomplete-selection-ui')) {
      floatingUI.style.opacity = '0';
      floatingUI.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        floatingUI.remove();
        clearSelectionMode();
      }, 300);
    }
  }, 60000);
    
}

// Clear selection mode state
function clearSelectionMode() {
  currentSuggestions = [];
  currentSuggestionIndex = 0;
  activeTextElement = null;
  logger.log('🔄 Selection mode cleared');
}

// Variables for rewrite UI state
let currentRewrites: string[] = [];
let currentRewriteIndex = 0;
let rewritePreviewElement: HTMLElement | null = null;
let rewriteTitleElement: HTMLElement | null = null;
let selectedTextRange: Range | null = null;
let isReplacingText = false;
let rewriteUITimeout: ReturnType<typeof setTimeout> | null = null;

// Helper function to update the rewrite UI
function updateRewriteUI(index: number) {
  const rewrite = currentRewrites[index];
  if (!rewrite) {
    logger.error('❌ No rewrite found at index', index);
    return;
  }
  
  logger.log(`🔄 Updating UI to show rewrite ${index + 1}: "${rewrite.substring(0, 50)}..."`);
  
  // Update the counter in the title if we have a reference
  if (rewriteTitleElement && currentRewrites.length > 1) {
    // Clear text nodes while preserving SVG
    while (rewriteTitleElement.lastChild) {
      if (rewriteTitleElement.lastChild.nodeName !== 'svg') {
        rewriteTitleElement.removeChild(rewriteTitleElement.lastChild);
      } else {
        break;
      }
    }
    // Add the updated text
    const textNode = document.createTextNode(` Text Rewrite (${index + 1}/${currentRewrites.length})`);
    rewriteTitleElement.appendChild(textNode);
  }
  
  // Update the preview text using our stored reference
  if (rewritePreviewElement) {
    logger.log('✅ Using stored preview element reference, updating text');
    const text = rewrite.substring(0, 150) + (rewrite.length > 150 ? '...' : '');
    rewritePreviewElement.textContent = text;
    logger.log(`📋 Preview updated with: ${text.substring(0, 50)}...`);
  } else {
    logger.error('❌ No stored preview element reference!');
    // Try to find it as fallback
    const preview = document.getElementById('ai-rewrite-preview');
    if (preview) {
      logger.log('Found preview element as fallback');
      rewritePreviewElement = preview;
      const text = rewrite.substring(0, 150) + (rewrite.length > 150 ? '...' : '');
      preview.textContent = text;
    }
  }
}


// Show rewrite UI with suggestions
function showRewriteUI(rewrites: string[]) {
  // Clear any existing timeout from previous rewrite UI
  if (rewriteUITimeout) {
    clearTimeout(rewriteUITimeout);
    rewriteUITimeout = null;
    logger.log('🔄 Cleared previous rewrite UI timeout');
  }
  
  // Remove any existing UI before showing new one
  const existingUI = document.getElementById('ai-autocomplete-rewrite-ui');
  if (existingUI) {
    existingUI.remove();
    logger.log('🔄 Removed existing rewrite UI');
  }
  
  // Store rewrites for cycling
  currentRewrites = rewrites;
  currentRewriteIndex = 0;
  
  // Debug log to see what we received
  logger.log('📝 Rewrites received in showRewriteUI:', rewrites);
  
  // Show floating UI with rewrites (positioned top-right)
  const rewriteUI = document.createElement('div');
  rewriteUI.id = 'ai-autocomplete-rewrite-ui';
  rewriteUI.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ffffff;
    color: #333333;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    max-width: 500px;
    min-width: 350px;
    animation: slideDown 0.2s ease-out;
  `;
  
  // Add animation styles if not already added
  if (!document.getElementById('ai-autocomplete-rewrite-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-autocomplete-rewrite-animation-styles';
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create UI content using DOM methods for better reliability
  const containerDiv = document.createElement('div');
  containerDiv.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
  
  // Title with icon
  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'font-weight: 500; color: #1a1a1a; display: flex; align-items: center; gap: 8px;';
  titleDiv.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 1.5L14.5 4.5L5 14L2 14.5L2.5 11.5L12 2L11.5 1.5Z" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Text Rewrite ${rewrites.length > 1 ? `(1/${rewrites.length})` : ''}
  `;
  containerDiv.appendChild(titleDiv);
  
  // Store reference to title element for updates
  rewriteTitleElement = titleDiv;
  
  // Preview box
  const previewDiv = document.createElement('div');
  previewDiv.id = 'ai-rewrite-preview';
  previewDiv.style.cssText = `
    background: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    color: #000000;
    font-weight: 500;
    max-height: 120px;
    overflow-y: auto;
    line-height: 1.4;
  `;
  // Set initial preview text
  const initialText = rewrites[0];
  previewDiv.textContent = initialText.substring(0, 150) + (initialText.length > 150 ? '...' : '');
  logger.log(`📋 Initial preview text set to: ${initialText.substring(0, 50)}...`);
  containerDiv.appendChild(previewDiv);
  
  // Store reference to preview element for updates
  rewritePreviewElement = previewDiv;
  
  // Keybind instructions
  const keybindDiv = document.createElement('div');
  keybindDiv.style.cssText = 'display: flex; gap: 6px; font-size: 12px; color: #666;';
  const keybindText = [];
  if (rewrites.length > 1) {
    keybindText.push(`<span style="font-weight: 500;">${keybindManager.getKeybindDisplay('cycle')}:</span> Next`);
  }
  keybindText.push('<span style="font-weight: 500;">Alt+R:</span> Replace');
  keybindText.push(`<span style="font-weight: 500;">${keybindManager.getKeybindDisplay('dismiss')}:</span> Dismiss`);
  keybindDiv.innerHTML = keybindText.join(' • ');
  containerDiv.appendChild(keybindDiv);
  
  // Info text
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = 'font-size: 11px; color: #999; font-style: italic;';
  infoDiv.textContent = 'Select a suggestion and press Alt+R to replace text';
  containerDiv.appendChild(infoDiv);
  
  rewriteUI.appendChild(containerDiv);
  
  document.body.appendChild(rewriteUI);
  
  // Set up keyboard handlers for the rewrite UI
  const rewriteKeyHandler = (event: KeyboardEvent) => {
    // Check if rewrite UI is visible
    const ui = document.getElementById('ai-autocomplete-rewrite-ui');
    if (!ui) return;
    
    // Handle Tab to cycle through rewrites
    if (keybindManager.matchesKeybind(event, 'cycle') && currentRewrites.length > 1) {
      event.preventDefault();
      currentRewriteIndex = (currentRewriteIndex + 1) % currentRewrites.length;
      updateRewriteUI(currentRewriteIndex);
      logger.log(`🔄 Cycled to rewrite ${currentRewriteIndex + 1}`);
    }
    
    // Handle Alt+R to accept and replace text
    if (event.altKey && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      
      // Prevent multiple replacements
      if (isReplacingText) {
        logger.log('⚠️ Replacement already in progress, ignoring duplicate Alt+R');
        return;
      }
      
      isReplacingText = true;
      const rewriteText = currentRewrites[currentRewriteIndex];
      
      // Remove UI immediately to prevent further interactions
      ui.remove();
      document.removeEventListener('keydown', rewriteKeyHandler);
      
      // Use async replacement
      replaceSelectedText(rewriteText).then(success => {
        if (success) {
          logger.log(`✅ Replaced text with rewrite ${currentRewriteIndex + 1}`);
          showInstruction('Text replaced successfully!', 2000);
        } else {
          logger.log(`📋 Text copied to clipboard`);
          showInstruction('Text copied! Press Ctrl+V to paste.', 3000);
        }
        
        // Clear state
        clearRewriteMode();
        isReplacingText = false;
      });
    }
    
    // Handle Escape to dismiss
    if (keybindManager.matchesKeybind(event, 'dismiss')) {
      event.preventDefault();
      ui.remove();
      clearRewriteMode();
      logger.log('❌ Rewrite suggestions dismissed');
    }
  };
  
  // Add event listener
  document.addEventListener('keydown', rewriteKeyHandler);
  
  // Auto-remove after 60 seconds
  rewriteUITimeout = setTimeout(() => {
    const ui = document.getElementById('ai-autocomplete-rewrite-ui');
    if (ui) {
      ui.style.opacity = '0';
      ui.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        ui.remove();
        clearRewriteMode();
        document.removeEventListener('keydown', rewriteKeyHandler);
      }, 300);
    }
  }, 60000);
  
  // Store the handler so we can remove it later
  (rewriteUI as any).keyHandler = rewriteKeyHandler;
}


// Replace selected text with rewrite
async function replaceSelectedText(newText: string): Promise<boolean> {
  try {
    // Restore the selection if we have it
    if (selectedTextRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(selectedTextRange);
        logger.log('✅ Selection restored');
      }
    }
    
    // Get the active element
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    
    // Try to use execCommand insertText first (most reliable)
    if (document.execCommand('insertText', false, newText)) {
      logger.log('✅ Text replaced using insertText command');
      return true;
    }
    
    // If that fails, try to simulate paste
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      const value = activeElement.value;
      
      // Replace the selected portion
      activeElement.value = value.substring(0, start) + newText + value.substring(end);
      
      // Set cursor position after the inserted text
      const newPosition = start + newText.length;
      activeElement.setSelectionRange(newPosition, newPosition);
      
      // Trigger input event for frameworks that listen to it
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      logger.log('✅ Text replaced in input/textarea element');
      return true;
    }
    
    // For contenteditable elements
    if (activeElement && activeElement.contentEditable === 'true') {
      document.execCommand('delete', false);
      document.execCommand('insertHTML', false, newText);
      logger.log('✅ Text replaced in contenteditable element');
      return true;
    }
    
    // If all else fails, copy to clipboard as backup
    logger.warn('⚠️ Could not replace text directly, copying to clipboard');
    await navigator.clipboard.writeText(newText);
    logger.log('✅ Text copied to clipboard as fallback');
    return false;
    
  } catch (error) {
    logger.error('Failed to replace text:', error);
    return false;
  }
}

// Clear rewrite mode state
function clearRewriteMode() {
  currentRewrites = [];
  currentRewriteIndex = 0;
  rewritePreviewElement = null;
  rewriteTitleElement = null;
  selectedTextRange = null;
  isReplacingText = false;
  
  // Clear the timeout if it exists
  if (rewriteUITimeout) {
    clearTimeout(rewriteUITimeout);
    rewriteUITimeout = null;
  }
  
  // Remove event listener if UI exists
  const ui = document.getElementById('ai-autocomplete-rewrite-ui');
  if (ui && (ui as any).keyHandler) {
    document.removeEventListener('keydown', (ui as any).keyHandler);
  }
  
  logger.log('🔄 Rewrite mode cleared');
}

// Show a manual copy button if all else fails
// Unused function - kept for potential future use
/* function showManualCopyOption(text: string) {
  const copyButton = document.createElement('div');
  copyButton.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: #3b82f6;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  `;
  copyButton.textContent = '📋 Click to copy suggestion to clipboard';
  
  copyButton.onclick = async () => {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = '✅ Copied! Now paste with Ctrl+V';
    copyButton.style.background = '#10b981';
    setTimeout(() => copyButton.remove(), 2000);
  };
  
  document.body.appendChild(copyButton);
  setTimeout(() => copyButton.remove(), 5000);
} */

function cycleSuggestion() {
  if (!activeTextElement || currentSuggestions.length === 0) return;
  
  // Cycle to the next suggestion
  currentSuggestionIndex = (currentSuggestionIndex + 1) % currentSuggestions.length;
  
  // Recreate ghost text with new suggestion
  createGhostText(activeTextElement, currentSuggestions, currentSuggestionIndex);
  
  logger.log(`🔄 Cycling to suggestion ${currentSuggestionIndex + 1} of ${currentSuggestions.length}`);
}

// Instruction tooltip
let instructionElement: HTMLElement | null = null;

function showLoadingCursor() {
  logger.log('🔄 Setting loading cursor...');
  
  // Store the original cursor if not already stored
  if (!originalCursor) {
    originalCursor = document.body.style.cursor || 'auto';
  }
  
  // Set loading cursor on body and all elements
  document.body.style.cursor = 'wait';
  
  // Also set on the active element
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && activeElement !== document.body) {
    activeElement.style.cursor = 'wait';
  }
  
  // Create a style element to override all cursors temporarily
  const styleElement = document.createElement('style');
  styleElement.id = 'ai-autocomplete-loading-cursor';
  styleElement.textContent = `
    * {
      cursor: wait !important;
    }
  `;
  document.head.appendChild(styleElement);
  
  logger.log('✅ Loading cursor activated');
}

function hideLoadingCursor() {
  logger.log('🔄 Restoring normal cursor...');
  
  // Restore original cursor
  document.body.style.cursor = originalCursor || 'auto';
  
  // Restore cursor on active element
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && activeElement !== document.body) {
    activeElement.style.cursor = '';
  }
  
  // Remove the override style
  const styleElement = document.getElementById('ai-autocomplete-loading-cursor');
  if (styleElement) {
    styleElement.remove();
  }
  
  // Clear stored cursor
  originalCursor = '';
  
  logger.log('✅ Normal cursor restored');
}

// Show canvas limitation notice with friendly message
function showCanvasLimitationNotice() {
  // Remove any existing notice
  const existingNotice = document.getElementById('ai-canvas-limitation-notice');
  if (existingNotice) {
    existingNotice.remove();
  }
  
  const notice = document.createElement('div');
  notice.id = 'ai-canvas-limitation-notice';
  notice.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24px 32px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    max-width: 400px;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  `;
  
  notice.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 12px;">🚧</div>
    <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px;">Canvas-Based Site Detected</div>
    <div style="opacity: 0.95; line-height: 1.5;">
      ${window.location.hostname} uses canvas-based rendering which limits our functionality.
    </div>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2);">
      <div style="font-size: 13px; opacity: 0.9;">
        <strong>Workaround:</strong> Copy text first (Ctrl+C), then use rewrite
      </div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
        🚀 Full support for Google Docs coming soon!
      </div>
    </div>
    <button id="close-canvas-notice" style="
      margin-top: 20px;
      padding: 8px 20px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.2s;
    ">Got it!</button>
  `;
  
  // Add animation styles if not present
  if (!document.getElementById('ai-canvas-notice-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-canvas-notice-styles';
    style.textContent = `
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translate(-50%, -40%);
        }
        to { 
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
      #close-canvas-notice:hover {
        background: rgba(255,255,255,0.3) !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notice);
  
  // Add close button handler
  const closeBtn = document.getElementById('close-canvas-notice');
  if (closeBtn) {
    closeBtn.onclick = () => {
      notice.style.opacity = '0';
      notice.style.transform = 'translate(-50%, -60%)';
      notice.style.transition = 'all 0.3s ease-in';
      setTimeout(() => notice.remove(), 300);
    };
  }
  
  // Auto-close after 8 seconds
  setTimeout(() => {
    if (document.getElementById('ai-canvas-limitation-notice')) {
      notice.style.opacity = '0';
      notice.style.transform = 'translate(-50%, -60%)';
      notice.style.transition = 'all 0.3s ease-in';
      setTimeout(() => notice.remove(), 300);
    }
  }, 8000);
}

function showError(message: string) {
  // Restore cursor when showing error
  hideLoadingCursor();
  
  const errorElement = document.createElement('div');
  errorElement.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: #dc2626;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  `;
  errorElement.textContent = message;
  document.body.appendChild(errorElement);
  
  setTimeout(() => {
    errorElement.style.opacity = '0';
    errorElement.style.transition = 'opacity 0.3s';
    setTimeout(() => errorElement.remove(), 300);
  }, 3000);
}

function showApiKeyError(message: string) {
  // Restore cursor when showing error
  hideLoadingCursor();
  
  // Remove any existing error elements
  const existingError = document.getElementById('ai-autocomplete-api-error');
  if (existingError) {
    existingError.remove();
  }
  
  const errorElement = document.createElement('div');
  errorElement.id = 'ai-autocomplete-api-error';
  errorElement.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    color: #333333;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    max-width: 420px;
    animation: slideUp 0.2s ease-out;
  `;
  
  errorElement.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="flex-shrink: 0; width: 24px; height: 24px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #111111; margin-bottom: 4px;">API Key Required</div>
        <div style="color: #666666; line-height: 1.4; margin-bottom: 12px;">${message}</div>
        <button id="ai-autocomplete-open-settings" style="
          background: #1a1a1a;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        ">Open Extension Settings</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorElement);
  
  // Add click handler for the button
  const button = document.getElementById('ai-autocomplete-open-settings');
  if (button) {
    button.addEventListener('click', () => {
      // Send message to background script to open the popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      errorElement.remove();
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.background = '#2d2d2d';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = '#1a1a1a';
    });
  }
  
  // Auto-remove after 8 seconds (longer for API key errors)
  setTimeout(() => {
    errorElement.style.opacity = '0';
    errorElement.style.transition = 'opacity 0.3s';
    setTimeout(() => errorElement.remove(), 300);
  }, 8000);
}

function showInstruction(customMessage?: string, duration?: number) {
  if (!instructionElement) {
    instructionElement = document.createElement('div');
    instructionElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(instructionElement);
  }
  
  // Use custom message if provided, otherwise show default instruction
  if (customMessage) {
    instructionElement.innerHTML = customMessage;
    
    // Auto-hide after duration if specified
    if (duration) {
      setTimeout(() => {
        hideInstruction();
      }, duration);
    }
  } else {
    // Update instruction text with suggestion counter
    const suggestionCounter = currentSuggestions.length > 1 
      ? ` <span style="color: #4CAF50;">[${currentSuggestionIndex + 1}/${currentSuggestions.length}]</span>` 
      : '';
    
    // Get current keybind displays
    const cycleKey = keybindManager.getKeybindDisplay('cycle');
    const acceptKey = keybindManager.getKeybindDisplay('accept');
    const dismissKey = keybindManager.getKeybindDisplay('dismiss');
    
    instructionElement.innerHTML = `Press <b>${cycleKey}</b> to ${currentSuggestions.length > 1 ? 'cycle' : 'next'}${suggestionCounter} • <b>${acceptKey}</b> to accept • <b>${dismissKey}</b> to dismiss`;
  }
}

function hideInstruction() {
  if (instructionElement) {
    instructionElement.remove();
    instructionElement = null;
  }
}

// Event listeners
document.addEventListener('keydown', (event) => {
  // Handle mode cycling keybind (Shift+Alt+M)
  if (event.shiftKey && event.altKey && event.key === 'M') {
    event.preventDefault();
    const newMode = completionModeManager.cycleMode();
    logger.log(`🔄 Switched to ${newMode} mode`);
    return;
  }
  
  // Handle manual injection keybind (works in any mode)
  if (keybindManager.matchesKeybind(event, 'manualInject')) {
    event.preventDefault();
    logger.log(`🔧 Manual injection triggered via ${keybindManager.getKeybindDisplay('manualInject')}`);
    
    // If we're here, the content script is already injected!
    // Show feedback that it's already active
    const indicator = document.createElement('div');
    indicator.textContent = '✅ AI Autocomplete is already active on this page';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(indicator);
    
    // Add a helper message
    const helper = document.createElement('div');
    helper.textContent = `Press ${keybindManager.getKeybindDisplay('trigger')} to use AI completions`;
    helper.style.cssText = `
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.9;
    `;
    indicator.appendChild(helper);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.3s';
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
    
    // Still try to inject in other frames if needed
    chrome.runtime.sendMessage({ 
      type: 'MANUAL_INJECT_REQUEST'
    }).catch(() => {
      // Ignore errors, we're already injected
    });
    
    return;
  }
  
  // Handle rewrite keybind for text improvement
  if (keybindManager.matchesKeybind(event, 'rewrite')) {
    logger.log(`✍️ Rewrite key (${keybindManager.getKeybindDisplay('rewrite')}) detected!`);
    event.preventDefault();
    
    // Store the current selection range for later replacement (for normal sites)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selectedTextRange = selection.getRangeAt(0).cloneRange();
    }
    
    // Get selected text - use special method for Google Docs
    let selectedText = '';
    
    if (isCanvasBasedSite) {
      // For Google Docs, we need to use the clipboard to get selected text
      logger.log('📋 Using clipboard method for Google Docs selected text');
      
      
      // Copy the selected text to clipboard
      document.execCommand('copy');
      
      // Read from clipboard with a small delay
      setTimeout(async () => {
        try {
          selectedText = await navigator.clipboard.readText();
          logger.log('✅ Got selected text from clipboard:', selectedText.substring(0, 50) + '...');
          
          if (!selectedText || selectedText.trim() === '') {
            showCanvasLimitationNotice();
            return;
          }
          
          // Continue with rewrite process
          processRewriteRequest(selectedText);
          
        } catch (error) {
          logger.error('Failed to read clipboard:', error);
          showCanvasLimitationNotice();
        }
      }, 50);
      
      return; // Exit here, the async callback will continue
    } else {
      // Normal sites - use standard selection API
      selectedText = getSelectedText();
    }
    
    if (!selectedText || selectedText.trim() === '') {
      // Show special message for canvas-based sites
      if (isCanvasBasedSite) {
        showCanvasLimitationNotice();
      } else {
        showError('Please select text to rewrite');
      }
      selectedTextRange = null;
      return;
    }
    
    // Continue with normal rewrite process
    processRewriteRequest(selectedText);
  }
  
  // Helper function to process rewrite request
  function processRewriteRequest(selectedText: string) {
    logger.log(`📝 Selected text for rewrite: ${selectedText.substring(0, 100)}...`);
    logger.log(`📊 Text length: ${selectedText.length} characters`);
    
    // Check if chrome.runtime is available
    if (!chrome?.runtime?.sendMessage || !extensionAlive) {
      logger.error('Extension context invalidated. Please reload the page.');
      showError('Extension was updated. Please reload the page (F5) to continue.');
      checkExtensionHealth();
      return;
    }
    
    // Show loading cursor
    showLoadingCursor();
    showInstruction('Rewriting selected text...', 2000);
    
    try {
      chrome.runtime.sendMessage({ type: 'GET_REWRITE', text: selectedText }, (response) => {
        // Restore normal cursor
        hideLoadingCursor();
        logger.log('Rewrite response received:', response);
        
        if (chrome.runtime.lastError) {
          logger.error('Chrome runtime error:', chrome.runtime.lastError);
          if (chrome.runtime.lastError.message?.includes('context invalidated')) {
            showError('Extension was updated. Please reload the page (F5) to continue.');
          } else {
            showError('Connection error. Check service worker.');
          }
        } else if (response?.error) {
          logger.error('Rewrite Error:', response.error);
          const errorMessage = response.userMessage || response.error;
          
          if (response.errorType === 'missing_api_key' || response.errorType === 'invalid_api_key') {
            showApiKeyError(errorMessage);
          } else {
            showError(errorMessage);
          }
        } else if (response?.rewrites && response.rewrites.length > 0) {
          logger.log(`✅ Received ${response.rewrites.length} rewrites`);
          logger.log('Model used:', response.modelUsed);
          
          // Show rewrite UI
          showRewriteUI(response.rewrites);
        } else {
          logger.warn('⚠️ Empty or invalid response from AI model');
          showError('Model returned empty response. Try a different model.');
        }
      });
    } catch (error) {
      logger.error('Error sending rewrite request:', error);
      hideLoadingCursor();
      showError('Extension connection lost. Please reload the page (F5).');
    }
  }
  
  // Handle trigger keybind for autocomplete
  if (keybindManager.matchesKeybind(event, 'trigger')) {
    // Skip autocomplete on canvas-based sites (Google Docs, etc.)
    if (isCanvasBasedSite) {
      logger.log('⚠️ Autocomplete is disabled on canvas-based sites');
      showError('Autocomplete not available on Google Docs. Use Rewrite with selected text instead.');
      return;
    }
    
    logger.log(`🎯 Trigger key (${keybindManager.getKeybindDisplay('trigger')}) detected!`);
    event.preventDefault();
    
    // Smart Cascade Text Extraction System
    let currentText = '';
    let extractionMethod = 'none';
    let textElement: TextElement | null = null;
    
    logger.log('🔍 Starting smart cascade text extraction...');
    
    // Priority 1: Try standard field detection (most accurate)
    textElement = getActiveTextElement();
    if (textElement) {
      currentText = textElement.getText();
      if (currentText && currentText.trim().length > 0) {
        extractionMethod = 'element';
        logger.log(`✅ Method 1 (Standard detection): Found ${textElement.type} with ${currentText.length} chars`);
      }
    }
    
    // Priority 2: Try enhanced text extraction manager (captures pastes, voice, etc.)
    if (!currentText || currentText.trim().length === 0) {
      const extractedText = textExtractionManager.getLastActiveText();
      if (extractedText && extractedText.trim().length > 0) {
        currentText = extractedText;
        extractionMethod = 'enhanced';
        logger.log(`✅ Method 2 (Enhanced extraction): Found ${currentText.length} chars from input events`);
        
        // Try to find the element for ghost text if possible
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl && activeEl !== document.body) {
          textElement = detectTextElement(activeEl);
        }
      }
    }
    
    // Priority 3: Try selection-based extraction (user-controlled)
    if (!currentText || currentText.trim().length === 0) {
      const selectedText = getSelectedText();
      if (selectedText && selectedText.trim().length > 0) {
        currentText = selectedText;
        extractionMethod = 'selection';
        logger.log(`✅ Method 3 (Selection): Found ${currentText.length} chars`);
        showInstruction('Using selected text for AI completion', 2000);
      }
    }
    
    // Priority 4: Use keyboard buffer as last resort (if enabled)
    if (!currentText || currentText.trim().length === 0) {
      if (keyboardBuffer.isEnabled() && keyboardBuffer.getBuffer().trim().length > 0) {
        currentText = keyboardBuffer.getBuffer();
        extractionMethod = 'keylogger';
        logger.log(`✅ Method 4 (Keyboard buffer): Using ${currentText.length} chars`);
        showInstruction('Using enhanced detection (last 300 characters typed)', 2000);
      }
    }
    
    // If all methods fail, show appropriate error
    if (!currentText || currentText.trim() === '') {
      logger.log('❌ All extraction methods failed');
      
      if (!keyboardBuffer.isEnabled()) {
        showError('No text detected. Try selecting text or enable "Enhanced Detection" in settings for difficult sites.');
      } else {
        showError('No text detected. Please type or select some text first.');
      }
      return;
    }
    
    logger.log(`📊 Extraction complete: Method="${extractionMethod}", Length=${currentText.length}`);

      logger.log('Triggered AI Autocomplete. Sending text:', currentText);

      // Check if chrome.runtime is available (extension context still valid)
      if (!chrome?.runtime?.sendMessage || !extensionAlive) {
        logger.error('Extension context invalidated. Please reload the page.');
        showError('Extension was updated. Please reload the page (F5) to continue using AI Autocomplete.');
        checkExtensionHealth(); // Force show reload notice
        return;
      }

      // Show loading cursor and mode indicator
      showLoadingCursor();
      completionModeManager.showModeIndicator(1500); // Show briefly

      try {
        chrome.runtime.sendMessage({ type: 'GET_COMPLETION', text: currentText }, (response) => {
          // Restore normal cursor once response is received
          hideLoadingCursor();
          logger.log('Response received:', response);
          if (chrome.runtime.lastError) {
            logger.error('Chrome runtime error:', chrome.runtime.lastError);
            // Check if it's a context invalidated error
            if (chrome.runtime.lastError.message?.includes('context invalidated')) {
              showError('Extension was updated. Please reload the page (F5) to continue.');
            } else {
              showError('Connection error. Check service worker.');
            }
          } else if (response?.error) {
          logger.error('AI Autocomplete Error:', response.error);
          // Use the user-friendly message if available, otherwise fall back to the error message
          const errorMessage = response.userMessage || response.error;
          
          // Show different UI based on error type
          if (response.errorType === 'missing_api_key' || response.errorType === 'invalid_api_key') {
            showApiKeyError(errorMessage);
          } else {
            showError(errorMessage);
          }
        } else if (response?.completions && response.completions.length > 0) {
          logger.log('✨ AI Suggestions Generated!');
          logger.log('📌 Model Used:', response.modelUsed || 'unknown');
          logger.log(`🔢 Received ${response.completions.length} suggestions`);
          
          // Clean up the suggestions (remove leading space if present)
          const cleanedSuggestions = response.completions.map((suggestion: string) => {
            return suggestion.startsWith(' ') ? suggestion.substring(1) : suggestion;
          });
          
          logger.log('💬 Suggestions:');
          cleanedSuggestions.forEach((s: string, i: number) => {
            logger.log(`  ${i + 1}. ${s.substring(0, 50)}...`);
          });
          
          // Handle display based on extraction method and available element
          if (textElement) {
            // We have a detected element - show ghost text
            createGhostText(textElement, cleanedSuggestions, 0);
            logger.log(`👻 Showing ghost text for ${textElement.type}`);
          } else if (extractionMethod === 'enhanced') {
            // Enhanced extraction: try to find the element for ghost text
            const activeEl = document.activeElement as HTMLElement;
            if (activeEl && activeEl !== document.body) {
              const detectedElement = detectTextElement(activeEl);
              if (detectedElement) {
                createGhostText(detectedElement, cleanedSuggestions, 0);
                logger.log('👻 Created ghost text for enhanced extraction');
              } else {
                // Can't create ghost text, use clipboard mode
                logger.log('📋 Enhanced extraction: using clipboard mode');
                handleSelectionCompletion(cleanedSuggestions);
              }
            } else {
              logger.log('📋 Enhanced extraction: no active element, using clipboard');
              handleSelectionCompletion(cleanedSuggestions);
            }
          } else if (extractionMethod === 'selection' || extractionMethod === 'keylogger') {
            // Selection or keylogger: use clipboard-based completion
            logger.log(`📋 Using clipboard mode for ${extractionMethod} extraction`);
            handleSelectionCompletion(cleanedSuggestions);
          } else {
            // Fallback to clipboard mode
            logger.log('📋 Fallback to clipboard mode');
            handleSelectionCompletion(cleanedSuggestions);
          }
          
          if (response.usedFallback) {
            logger.warn('⚠️ Used fallback model due to primary model failure');
          }
        } else {
          logger.warn('⚠️ Empty or invalid response from AI model');
          logger.log('Full response:', response);
          showError('Model returned empty response. Try a different model.');
        }
      });
      } catch (error) {
        logger.error('Error sending message to extension:', error);
        hideLoadingCursor(); // Restore cursor on error
        showError('Extension connection lost. Please reload the page (F5).');
      }
  }
  
  // Handle cycle keybind for browsing suggestions
  if (keybindManager.matchesKeybind(event, 'cycle')) {
    // Check if we're in selection mode (UI visible but no ghost text)
    const selectionUI = document.getElementById('ai-autocomplete-selection-ui');
    if (selectionUI && currentSuggestions.length > 0) {
      event.preventDefault();
      if (currentSuggestions.length > 1 && !event.shiftKey) {
        // Cycle through suggestions in selection mode
        currentSuggestionIndex = (currentSuggestionIndex + 1) % currentSuggestions.length;
        const nextSuggestion = currentSuggestions[currentSuggestionIndex];
        
        // Update clipboard and add to buffer
        navigator.clipboard.writeText(nextSuggestion).then(() => {
          logger.log(`✅ Suggestion ${currentSuggestionIndex + 1} copied to clipboard`);
          // Add to keyboard buffer for continuity
          keyboardBuffer.appendToBuffer(nextSuggestion);
          
          // Update UI
          const titleElement = selectionUI.querySelector('div > div:first-child');
          if (titleElement) {
            titleElement.textContent = `Completion (${currentSuggestionIndex + 1}/${currentSuggestions.length})`;
          }
          const preview = document.getElementById('ai-suggestion-preview');
          if (preview) {
            preview.textContent = `${nextSuggestion.substring(0, 100)}${nextSuggestion.length > 100 ? '...' : ''}`;
          }
        });
        
        logger.log(`🔄 Cycled to suggestion ${currentSuggestionIndex + 1}`);
      }
    } else if (ghostTextElement) {
      // Standard mode with ghost text
      event.preventDefault();
      if (currentSuggestions.length > 1 && !event.shiftKey) {
        // If multiple suggestions, cycle through them
        cycleSuggestion();
      } else {
        // If single suggestion or Shift+Tab, accept current
        acceptSuggestion();
      }
    }
  }
  
  // Handle accept keybind to accept current suggestion
  if (keybindManager.matchesKeybind(event, 'accept')) {
    const selectionUI = document.getElementById('ai-autocomplete-selection-ui');
    if (selectionUI && currentSuggestions.length > 0) {
      event.preventDefault();
      // Selection mode: Copy and close
      logger.log(`✅ Accepted suggestion via ${keybindManager.getKeybindDisplay('accept')}`);
      // Brief visual feedback
      selectionUI.style.opacity = '0';
      selectionUI.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        selectionUI.remove();
        clearSelectionMode();
      }, 300);
    } else if (ghostTextElement) {
      // Standard mode: Accept suggestion
      event.preventDefault();
      acceptSuggestion();
    }
  }
  
  // Handle dismiss keybind to cancel suggestions
  if (keybindManager.matchesKeybind(event, 'dismiss')) {
    const selectionUI = document.getElementById('ai-autocomplete-selection-ui');
    if (selectionUI) {
      event.preventDefault();
      selectionUI.remove();
      clearSelectionMode();
      logger.log('❌ Selection suggestions dismissed');
    } else if (ghostTextElement) {
      event.preventDefault();
      removeGhostText();
      logger.log('❌ Suggestions dismissed');
    }
  }
});

// Remove ghost text when typing
document.addEventListener('input', () => {
  if (ghostTextElement) {
    removeGhostText();
  }
});

// Remove ghost text when clicking elsewhere
document.addEventListener('click', (event) => {
  if (ghostTextElement && event.target !== activeTextElement?.element) {
    removeGhostText();
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'SHOW_ACTIVATION_FEEDBACK') {
    // Show feedback that the extension was just activated
    const indicator = document.createElement('div');
    indicator.textContent = '✅ AI Autocomplete Activated!';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(indicator);
    
    // Add helper text
    const helper = document.createElement('div');
    helper.textContent = `Press ${keybindManager.getKeybindDisplay('trigger')} to use AI completions`;
    helper.style.cssText = `
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.9;
    `;
    indicator.appendChild(helper);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.3s';
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
  }
  
  if (request.type === 'SHOW_ALREADY_ACTIVE_FEEDBACK') {
    // Show feedback that it's already active
    const indicator = document.createElement('div');
    indicator.textContent = '✅ AI Autocomplete is already active';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(indicator);
    
    // Add helper text
    const helper = document.createElement('div');
    helper.textContent = `Press ${keybindManager.getKeybindDisplay('trigger')} to use AI completions`;
    helper.style.cssText = `
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.9;
    `;
    indicator.appendChild(helper);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.3s';
      setTimeout(() => indicator.remove(), 300);
    }, 2500);
  }
});

} // End of initializeAutocomplete function

})(); // End of IIFE wrapper to prevent duplicate injection