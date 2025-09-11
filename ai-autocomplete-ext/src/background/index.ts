import { backgroundLogger as logger } from '../utils/logger';
import { checkHasConsented, isFirstInstall, getInjectionMode, checkInjectionModePermissions, isDeveloperModeEnabled, type InjectionMode } from '../utils/privacy';
import { initializeExtPay } from '../utils/licensing';
import { retrieveApiKey, migrateToEncryptedStorage } from '../utils/security';

logger.log('AI Autocomplete background script loaded');

// Initialize ExtensionPay for premium features
initializeExtPay().catch(error => {
  logger.error('Failed to initialize ExtensionPay:', error);
  // Continue without premium features
});

// Import system prompts from dedicated file
// This separation makes prompts easier to maintain and modify
// See prompts.ts for documentation on future dynamic prompt features
import { 
  getSystemPrompt, 
  MODE_TOKEN_LIMITS, 
  getNumberedListPrompt,
  getRewriteSystemPrompt,
  type CompletionMode 
} from './prompts';

// Type definition for OpenRouter model
interface OpenRouterModel {
  id: string;
  name: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  supported_parameters?: string[];
  [key: string]: any;
}

// Cache for models list
let modelsCache: OpenRouterModel[] | null = null;
let modelsCacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Fetch available models from OpenRouter
async function fetchAvailableModels() {
  // Check cache first
  if (modelsCache && Date.now() - modelsCacheTimestamp < CACHE_TTL) {
    return modelsCache;
  }

  try {
    logger.log('Fetching models from OpenRouter API...');
    const response = await fetch('https://openrouter.ai/api/v1/models');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    modelsCache = data.data;
    modelsCacheTimestamp = Date.now();
    
    logger.log(`Fetched ${modelsCache?.length || 0} models from OpenRouter`);
    
    // Store models in chrome storage for popup access
    chrome.storage.local.set({ availableModels: modelsCache });
    
    return modelsCache;
  } catch (error) {
    logger.error('Failed to fetch models:', error);
    // Try to get from storage as fallback
    const stored = await chrome.storage.local.get(['availableModels']);
    return stored.availableModels || [];
  }
}

// NOTE: System prompts have been moved to ./prompts.ts for easier maintenance
// The getSystemPrompt function is now imported from that file
// This allows for quick prompt modifications without searching through the main logic
// See prompts.ts for documentation on planned dynamic prompt learning features

// Helper function to detect if a model is a reasoning model
function isReasoningModel(modelId: string): boolean {
  const reasoningModels = [
    'qwen',
    'deepseek',
    'o1',
    'o3',
    'gpt-5',
    'claude-4.1',
    'claude-3.7',
    'thinking',
    'reasoning',
    'r1'
  ];
  
  const lowerModelId = modelId.toLowerCase();
  return reasoningModels.some(pattern => lowerModelId.includes(pattern));
}

// Function to check if a model supports structured outputs
async function supportsStructuredOutputs(modelId: string): Promise<boolean> {
  // First try to get from cache
  if (!modelsCache) {
    await fetchAvailableModels();
  }
  
  const model = modelsCache?.find(m => m.id === modelId);
  if (!model) {
    logger.log(`⚠️ Model ${modelId} not found in cache, assuming no structured output support`);
    return false;
  }
  
  // Check if model has structured_outputs or response_format in supported_parameters
  const supportedParams = model.supported_parameters || [];
  const hasStructuredOutput = supportedParams.some(param => 
    param === 'structured_outputs' || 
    param === 'response_format' ||
    param === 'json_schema'
  );
  
  logger.log(`📊 Model ${modelId} structured output support: ${hasStructuredOutput}`);
  return hasStructuredOutput;
}


// Robust function to extract completions from various response formats
function extractCompletions(text: string): string[] {
  logger.log('🔍 Attempting to extract completions from response...');
  
  // Strategy 1: Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const completions = parsed.filter(c => typeof c === 'string' && c.trim() !== '');
      if (completions.length > 0) {
        logger.log(`✅ Strategy 1 (Direct JSON): Found ${completions.length} completions`);
        return completions;
      }
    }
  } catch (e) {
    logger.log('❌ Strategy 1 (Direct JSON) failed');
  }

  // Strategy 2: Extract JSON array from anywhere in the text
  const jsonArrayRegex = /\[[\s\S]*?\]/g;
  const matches = text.match(jsonArrayRegex);
  if (matches) {
    for (const match of matches) {
      try {
        // Clean up common JSON issues
        let cleaned = match
          .replace(/,\s*]/, ']') // Remove trailing commas
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/\n/g, '\\n') // Escape newlines within the JSON
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
        
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          const completions = parsed.filter(c => typeof c === 'string' && c.trim() !== '');
          if (completions.length > 0) {
            logger.log(`✅ Strategy 2 (Extract JSON): Found ${completions.length} completions`);
            return completions;
          }
        }
      } catch (e) {
        // Try next match
      }
    }
  }
  logger.log('❌ Strategy 2 (Extract JSON) failed');

  // Strategy 3: Extract from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  const codeBlocks = [...text.matchAll(codeBlockRegex)];
  for (const block of codeBlocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      if (Array.isArray(parsed)) {
        const completions = parsed.filter(c => typeof c === 'string' && c.trim() !== '');
        if (completions.length > 0) {
          logger.log(`✅ Strategy 3 (Code blocks): Found ${completions.length} completions`);
          return completions;
        }
      }
    } catch (e) {
      // Try next block
    }
  }
  logger.log('❌ Strategy 3 (Code blocks) failed');

  // Strategy 4: Parse numbered list (1. completion, 2. completion, etc.)
  const numberedListRegex = /^\d+\.\s*(.+)$/gm;
  const numberedMatches = [...text.matchAll(numberedListRegex)];
  if (numberedMatches.length > 0) {
    const completions = numberedMatches
      .map(m => m[1].trim())
      .filter(c => c.length > 0)
      .map(c => c.replace(/^["']|["']$/g, '')); // Remove surrounding quotes if any
    if (completions.length > 0) {
      logger.log(`✅ Strategy 4 (Numbered list): Found ${completions.length} completions`);
      return completions;
    }
  }
  logger.log('❌ Strategy 4 (Numbered list) failed');

  // Strategy 5: Parse bullet points (-, *, •)
  const bulletRegex = /^[\-\*•]\s*(.+)$/gm;
  const bulletMatches = [...text.matchAll(bulletRegex)];
  if (bulletMatches.length > 0) {
    const completions = bulletMatches
      .map(m => m[1].trim())
      .filter(c => c.length > 0)
      .map(c => c.replace(/^["']|["']$/g, '')); // Remove surrounding quotes if any
    if (completions.length > 0) {
      logger.log(`✅ Strategy 5 (Bullet list): Found ${completions.length} completions`);
      return completions;
    }
  }
  logger.log('❌ Strategy 5 (Bullet list) failed');

  // Strategy 6: Extract quoted strings
  const quotedRegex = /"([^"]+)"/g;
  const quotedMatches = [...text.matchAll(quotedRegex)];
  if (quotedMatches.length >= 2) {
    const completions = quotedMatches
      .map(m => m[1].trim())
      .filter(c => c.length > 5); // Filter out very short strings that might not be completions
    if (completions.length > 0) {
      logger.log(`✅ Strategy 6 (Quoted strings): Found ${completions.length} completions`);
      return completions;
    }
  }
  logger.log('❌ Strategy 6 (Quoted strings) failed');

  // Strategy 7: Split by newlines and filter
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 5 && !line.includes(':') && !line.toLowerCase().includes('here'))
    .map(line => line.replace(/^["']|["']$/g, '')); // Remove surrounding quotes
  
  if (lines.length >= 2) {
    logger.log(`✅ Strategy 7 (Newline split): Found ${lines.length} potential completions`);
    return lines.slice(0, 5); // Take max 5
  }
  logger.log('❌ Strategy 7 (Newline split) failed');

  // If all strategies fail, return the original text as single completion
  logger.log('⚠️ All strategies failed, returning original text as single completion');
  return [text];
}

// Function to ensure we have exactly 5 completions
function ensureFiveCompletions(completions: string[]): string[] {
  if (completions.length === 0) {
    return ["I can help you complete this text", "Let me continue this for you", "Here's a possible continuation", "This could be completed as", "One way to continue is"];
  }
  
  if (completions.length >= 5) {
    return completions.slice(0, 5);
  }
  
  // If we have fewer than 5, create variations
  const result = [...completions];
  while (result.length < 5) {
    const base = result[result.length - 1];
    // Create slight variations
    if (result.length === 2) {
      result.push(base + ".");
    } else if (result.length === 3) {
      result.push(base + "...");
    } else if (result.length === 4) {
      result.push(base + " as well");
    }
  }
  
  return result;
}

// Function to ensure we have exactly 3 rewrites
function ensureThreeRewrites(rewrites: string[]): string[] {
  if (rewrites.length === 0) {
    return ["I can help improve this text", "Let me rewrite this for you", "Here's a better version"];
  }
  
  if (rewrites.length >= 3) {
    return rewrites.slice(0, 3);
  }
  
  // If we only have 1 rewrite, create slight variations
  if (rewrites.length === 1) {
    const base = rewrites[0];
    const result = [base];
    
    // Try to create variations by modifying sentence structure
    // Variation 1: Change beginning if possible
    if (base.length > 20) {
      const words = base.split(' ');
      if (words.length > 5) {
        // Rearrange slightly if it's a longer sentence
        const variation1 = base.replace(/^(I |The |This |That |My |Your |Our |Their )/i, (match) => {
          const replacements: { [key: string]: string } = {
            'I ': 'My ',
            'My ': 'I ',
            'The ': 'This ',
            'This ': 'The ',
            'That ': 'This ',
            'Your ': 'The ',
            'Our ': 'The ',
            'Their ': 'The '
          };
          return replacements[match] || match;
        });
        result.push(variation1 !== base ? variation1 : base + '.');
      } else {
        result.push(base + '.');
      }
    } else {
      result.push(base + '.');
    }
    
    // Variation 2: Add slight modification to ending
    if (base.endsWith('.')) {
      result.push(base.slice(0, -1) + ' as well.');
    } else {
      result.push(base + ' too.');
    }
    
    return result;
  }
  
  // If we have 2 rewrites, just duplicate one
  if (rewrites.length === 2) {
    return [...rewrites, rewrites[1]];
  }
  
  return rewrites;
}

// Inject content script into all existing tabs when extension is installed/updated
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.log('Extension installed/updated, checking consent status...');
  
  // Migrate existing API keys to encrypted storage on update
  if (details.reason === 'update') {
    logger.log('Extension updated, checking for data migration...');
    await migrateToEncryptedStorage();
  }
  
  // Check if this is a fresh install
  if (details.reason === 'install') {
    const isFirst = await isFirstInstall();
    const hasConsent = await checkHasConsented();
    
    if (isFirst && !hasConsent) {
      // Open consent page for new installations
      logger.log('First installation detected, opening consent page...');
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/consent/consent.html'),
        active: true
      });
      return; // Don't inject scripts until consent is given
    }
  }
  
  // Check if user has consented before proceeding
  const hasConsent = await checkHasConsented();
  if (!hasConsent) {
    logger.log('User has not consented, skipping initialization...');
    return;
  }
  
  // Fetch models on install
  await fetchAvailableModels();
  
  // Don't inject into all tabs immediately - wait for user to activate them
  // This is more privacy-friendly and reduces memory usage
  logger.log('Extension ready. Content scripts will be injected when tabs are activated.');
});

// Track which tabs have had the content script injected
const injectedTabs = new Set<number>();
// Track tabs currently being injected to prevent race conditions
const injectingTabs = new Set<number>();

// Current injection mode
let currentInjectionMode: InjectionMode = 'conservative';
// Track if injection mode has been initialized with proper permissions
let injectionModeInitialized = false;

// Store listener references for proper cleanup
let aggressiveNavigationListener: ((details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void) | null = null;
let balancedNavigationListener: ((details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void) | null = null;

// Initialize injection mode and set up appropriate listeners
async function initializeInjectionMode() {
  injectionModeInitialized = false;
  
  // Check if developer mode is enabled
  const isDeveloperMode = await isDeveloperModeEnabled();
  
  if (isDeveloperMode) {
    logger.log('🚧 DEVELOPER MODE ENABLED - Using aggressive injection everywhere');
    currentInjectionMode = 'aggressive';
    injectionModeInitialized = true;
    
    // Clean up any existing listeners first
    cleanupListeners();
    
    // In developer mode, inject everywhere immediately
    await setupDeveloperMode();
    return;
  }
  
  currentInjectionMode = await getInjectionMode();
  logger.log('Initializing injection mode:', currentInjectionMode);
  
  // Clean up any existing listeners first
  cleanupListeners();
  
  // Check if we have permissions for the current mode
  const hasPermissions = await checkInjectionModePermissions(currentInjectionMode);
  
  if (!hasPermissions && currentInjectionMode !== 'conservative') {
    logger.warn(`Missing permissions for ${currentInjectionMode} mode, falling back to conservative mode`);
    // Don't save this fallback, just use it for this session until permissions are granted
    currentInjectionMode = 'conservative';
  }
  
  // Set up listeners based on injection mode
  let setupSuccess = false;
  switch (currentInjectionMode) {
    case 'aggressive':
      setupSuccess = await setupAggressiveMode();
      break;
    case 'balanced':
      setupSuccess = await setupBalancedMode();
      break;
    case 'conservative':
    default:
      // Conservative mode only injects on popup open (handled elsewhere)
      logger.log('Conservative mode: Content script will only inject when popup opens');
      setupSuccess = true;
      break;
  }
  
  // If setup failed, fall back to conservative
  if (!setupSuccess && currentInjectionMode !== 'conservative') {
    logger.warn('Failed to set up mode, falling back to conservative');
    currentInjectionMode = 'conservative';
    setupSuccess = true; // Conservative always works
  }
  
  // Mark as initialized only if setup was successful
  injectionModeInitialized = setupSuccess;
  logger.log('Injection mode initialization complete:', { mode: currentInjectionMode, initialized: injectionModeInitialized });
  
  // Load persisted tabs for aggressive mode
  if (currentInjectionMode === 'aggressive' && setupSuccess) {
    await loadPersistedTabs();
  }
}

// Clean up all listeners
function cleanupListeners() {
  logger.log('Cleaning up existing listeners...');
  
  // Remove aggressive mode listener
  if (aggressiveNavigationListener && chrome.webNavigation) {
    chrome.webNavigation.onCommitted.removeListener(aggressiveNavigationListener);
    aggressiveNavigationListener = null;
  }
  
  // Remove balanced mode listeners
  
  if (balancedNavigationListener && chrome.webNavigation) {
    chrome.webNavigation.onCompleted.removeListener(balancedNavigationListener);
    balancedNavigationListener = null;
  }
}

// Set up developer mode - inject everywhere without permission checks
async function setupDeveloperMode() {
  logger.log('Setting up developer mode injection (no permission checks)');
  
  // Inject into all existing tabs immediately
  try {
    const tabs = await chrome.tabs.query({});
    logger.log(`Developer mode: Injecting into ${tabs.length} existing tabs...`);
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        await injectContentScript(tab.id);
      }
    }
  } catch (error) {
    logger.error('Error injecting into existing tabs:', error);
  }
  
  // Listen for all navigations
  if (chrome.webNavigation) {
    aggressiveNavigationListener = async (details) => {
      if (details.frameId === 0) { // Main frame only
        logger.log('Developer mode: Auto-injecting on navigation to', details.url);
        await injectContentScript(details.tabId);
      }
    };
    
    chrome.webNavigation.onCommitted.addListener(aggressiveNavigationListener);
    logger.log('Developer mode navigation listener attached');
  }
  
}

// Set up aggressive mode injection
async function setupAggressiveMode(): Promise<boolean> {
  logger.log('Setting up aggressive mode injection');
  
  // Check permissions separately for better error handling
  const hasPermissions = await chrome.permissions.contains({ 
    permissions: ['webNavigation', 'tabs']
  });
  
  const hasOrigins = await chrome.permissions.contains({
    origins: ['https://*/*', 'http://localhost/*', 'file:///*']
  });
  
  logger.log('Aggressive mode permission check:', { hasPermissions, hasOrigins });
  
  if (!hasPermissions || !hasOrigins) {
    logger.warn('Aggressive mode missing required permissions:', {
      permissions: hasPermissions,
      origins: hasOrigins
    });
    return false;
  }
  
  // Inject into all existing tabs on startup
  chrome.tabs.query({}, async (tabs) => {
    logger.log(`Injecting into ${tabs.length} existing tabs...`);
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        await injectContentScript(tab.id);
      }
    }
  });
  
  // Create and store the listener
  if (chrome.webNavigation) {
    aggressiveNavigationListener = async (details) => {
      if (details.frameId === 0) { // Main frame only
        logger.log('Aggressive mode: Injecting on navigation to', details.url);
        await injectContentScript(details.tabId);
      }
    };
    
    chrome.webNavigation.onCommitted.addListener(aggressiveNavigationListener);
    logger.log('Aggressive mode navigation listener attached');
  }
  
  return true;
}

// Set up balanced mode injection  
async function setupBalancedMode(): Promise<boolean> {
  logger.log('Setting up balanced mode injection');
  
  // Check permissions separately for better error handling
  const hasPermissions = await chrome.permissions.contains({ 
    permissions: ['webNavigation']
  });
  
  const hasOrigins = await chrome.permissions.contains({
    origins: ['https://*/*', 'http://localhost/*']
  });
  
  logger.log('Balanced mode permission check:', { hasPermissions, hasOrigins });
  
  if (!hasPermissions || !hasOrigins) {
    logger.warn('Balanced mode missing required permissions:', {
      permissions: hasPermissions,
      origins: hasOrigins  
    });
    return false;
  }
  
  // In balanced mode, we only inject on navigation completion for active tabs
  // This prevents duplicate injections that were happening with both onActivated and onCompleted
  if (chrome.webNavigation) {
    balancedNavigationListener = async (details) => {
      if (details.frameId === 0) { // Main frame only
        // Only inject if tab is active
        const tab = await chrome.tabs.get(details.tabId);
        if (tab.active) {
          logger.log('Balanced mode: Injecting on navigation completion', details.url);
          await injectContentScript(details.tabId);
        }
      }
    };
    
    chrome.webNavigation.onCompleted.addListener(balancedNavigationListener);
    logger.log('Balanced mode navigation listener attached');
  }
  
  return true;
}

// Load persisted tabs for aggressive mode
async function loadPersistedTabs() {
  try {
    const result = await chrome.storage.local.get(['persistedInjectedTabs']);
    if (result.persistedInjectedTabs && Array.isArray(result.persistedInjectedTabs)) {
      for (const tabId of result.persistedInjectedTabs) {
        injectedTabs.add(tabId);
      }
      logger.log('Loaded persisted tabs:', result.persistedInjectedTabs);
    }
  } catch (error) {
    logger.error('Error loading persisted tabs:', error);
  }
}

// Persist injected tabs for aggressive mode
async function persistInjectedTabs() {
  if (currentInjectionMode === 'aggressive') {
    try {
      const tabIds = Array.from(injectedTabs);
      await chrome.storage.local.set({ persistedInjectedTabs: tabIds });
      logger.log('Persisted injected tabs:', tabIds);
    } catch (error) {
      logger.error('Error persisting tabs:', error);
    }
  }
}

// Initialize injection mode on startup (after all listeners are registered)
// We need to wait a bit to ensure Chrome APIs are ready
setTimeout(async () => {
  try {
    await initializeInjectionMode();
  } catch (error) {
    logger.error('Failed to initialize injection mode:', error);
    // Fall back to conservative mode but mark as initialized so basic functionality works
    currentInjectionMode = 'conservative';
    injectionModeInitialized = true;
    logger.log('Fallback to conservative mode after initialization error');
  }
}, 100);

// Helper function to inject content script into a specific tab
async function injectContentScript(tabId: number): Promise<boolean> {
  // Check if already injected or currently being injected
  if (injectedTabs.has(tabId)) {
    return true;
  }
  
  // Check if injection is already in progress for this tab
  if (injectingTabs.has(tabId)) {
    logger.log(`Injection already in progress for tab ${tabId}, skipping duplicate`);
    return false;
  }
  
  // Mark this tab as being injected
  injectingTabs.add(tabId);
  
  try {
    // Get tab info to check URL
    const tab = await chrome.tabs.get(tabId);
    
    // Don't inject into chrome:// URLs or other restricted pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      injectingTabs.delete(tabId);
      return false;
    }
    
    // Check if user has consented
    const hasConsent = await checkHasConsented();
    if (!hasConsent) {
      logger.log('User has not consented, skipping content script injection');
      injectingTabs.delete(tabId);
      return false;
    }
    
    // Inject the content script into all frames (including iframes)
    await chrome.scripting.executeScript({
      target: { 
        tabId: tabId,
        allFrames: true  // This enables iframe support
      },
      files: ['content.js']
    });
    
    injectedTabs.add(tabId);
    logger.log(`Content script injected into tab ${tabId}`);
    
    // Persist tabs for aggressive mode
    await persistInjectedTabs();
    
    // Update badge to show injection status
    updateBadgeForTab(tabId, true);
    
    return true;
  } catch (error) {
    logger.error(`Failed to inject content script into tab ${tabId}:`, error);
    return false;
  } finally {
    // Always remove from injectingTabs when done
    injectingTabs.delete(tabId);
  }
}

// Badge update functions
function updateBadgeForTab(tabId: number, injected: boolean) {
  const color = injected ? '#10b981' : '#ef4444'; // Green for injected, red for not
  const text = injected ? '✓' : '';
  
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}

// Listen for tab activation to update badge
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const isInjected = injectedTabs.has(activeInfo.tabId);
  updateBadgeForTab(activeInfo.tabId, isInjected);
});

// Inject content script when a tab is updated (navigated)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // Clear tracking when page navigation happens
  if (changeInfo.status === 'complete') {
    const wasInjected = injectedTabs.has(tabId);
    injectedTabs.delete(tabId);
    
    // Update badge if it was previously injected
    if (wasInjected) {
      updateBadgeForTab(tabId, false);
    }
    
    // Only re-inject if injection mode is properly initialized
    if (!injectionModeInitialized) {
      logger.log('Injection mode not yet initialized, skipping auto-injection');
      return;
    }
    
    // Re-inject based on mode
    if (currentInjectionMode === 'aggressive') {
      await injectContentScript(tabId);
    } else if (currentInjectionMode === 'balanced') {
      const tab = await chrome.tabs.get(tabId);
      if (tab.active) {
        await injectContentScript(tabId);
      }
    }
    // Conservative mode doesn't auto-inject
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
  injectingTabs.delete(tabId);
  // Badge is automatically cleared when tab closes
});

// Clear injection state when navigating to a new page
if (chrome.webNavigation) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) { // Main frame navigation
      // Clear the injection state so the script can be re-injected on the new page
      injectedTabs.delete(details.tabId);
      injectingTabs.delete(details.tabId);
    }
  });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  logger.log('Background received message:', request);
  
  if (request.type === "OPEN_POPUP") {
    // Open the extension popup programmatically
    chrome.action.openPopup().catch(() => {
      // If openPopup fails (not supported in all contexts), create a new tab with the popup
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/popup/index.html')
      });
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === "GET_COMPLETION") {
    logger.log('Processing GET_COMPLETION request');
    
    // Check consent before processing any API requests
    checkHasConsented().then(async (hasConsent) => {
      if (!hasConsent) {
        logger.error('User has not consented, blocking API request');
        sendResponse({ error: 'Privacy consent required. Please complete the consent process.' });
        return;
      }
      
      // Get encrypted API key first
      const apiKey = await retrieveApiKey();
      
      chrome.storage.sync.get(['selectedModel', 'modelSettings', 'customSystemPrompt', 'completionMode'], async (result) => {
      logger.log('=============== AUTOCOMPLETE REQUEST ===============');
      logger.log('Retrieved settings from storage');
      logger.log('🚀 ACTIVE MODEL:', result.selectedModel || 'google/gemini-2.5-flash-lite');
      logger.log('Temperature:', result.modelSettings?.temperature || 0.7);
      logger.log('Max Tokens:', result.modelSettings?.maxTokens || 100);
      
      // Get completion mode and determine token limit
      const completionMode: CompletionMode = result.completionMode || 'short';
      const modeTokenLimit = MODE_TOKEN_LIMITS[completionMode];
      logger.log('Completion Mode:', completionMode, '| Mode Token Limit:', modeTokenLimit);
      
      if (!apiKey) {
        const errorMsg = "⚠️ No API key found. Please click the extension icon and enter your OpenRouter API key.";
        logger.error(errorMsg);
        sendResponse({ 
          error: errorMsg,
          errorType: 'missing_api_key',
          userMessage: "No API key configured. Click the AI Autocomplete extension icon to add your OpenRouter API key."
        });
        return;
      }
      
      // Basic API key validation
      if (apiKey.length < 20 || !apiKey.startsWith('sk-')) {
        const errorMsg = "⚠️ Invalid API key format. OpenRouter API keys should start with 'sk-' and be at least 20 characters long.";
        logger.error(errorMsg);
        sendResponse({ 
          error: errorMsg,
          errorType: 'invalid_api_key',
          userMessage: "Invalid API key format. Please check your OpenRouter API key in the extension settings."
        });
        return;
      }

      // Use selected model or fallback to free model
      const modelId = result.selectedModel || 'google/gemini-2.5-flash-lite';
      const temperature = result.modelSettings?.temperature || 0.7;
      // Use mode-based token limit (user's maxTokens setting is overridden by mode)
      const maxTokens = modeTokenLimit;

      try {
        logger.log('----------------------------------------------------');
        logger.log(`📡 Making API request to OpenRouter`);
        logger.log(`📌 Model ID: ${modelId}`);
        logger.log(`📝 Request text: "${request.text.substring(0, 50)}..."`);
        logger.log(`🔢 Requesting 5 different completions`);
        
        // Check if model supports structured outputs
        const hasStructuredOutput = await supportsStructuredOutputs(modelId);
        logger.log(`📊 Model ${modelId} structured output support: ${hasStructuredOutput}`);
        
        // Build request body based on model capabilities
        const requestBody: any = {
          "model": modelId,
          "temperature": temperature,
          "max_tokens": maxTokens,
          "stream": false
        };
        
        // Determine which prompt format to use
        let useNumberedFormat = false;
        
        if (hasStructuredOutput) {
          // Use structured output with JSON schema
          logger.log('✨ Using structured output with JSON schema');
          
          requestBody.messages = [
            {
              role: "system",
              content: getSystemPrompt(result.customSystemPrompt, true, completionMode)
            },
            {
              role: "user",
              content: `Text to continue: "${request.text}"`
            }
          ];
          
          // Add response_format for structured output
          requestBody.response_format = {
            type: "json_schema",
            json_schema: {
              name: "completions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  completions: {
                    type: "array",
                    items: {
                      type: "string",
                      description: "A text completion"
                    },
                    minItems: 5,
                    maxItems: 5,
                    description: "Exactly 5 different text completions"
                  }
                },
                required: ["completions"],
                additionalProperties: false
              }
            }
          };
        } else {
          // Use numbered list format for better reliability
          logger.log('📝 Using numbered list format for better reliability');
          useNumberedFormat = true;
          
          requestBody.messages = [
            {
              role: "system",
              content: getNumberedListPrompt(completionMode)
            },
            {
              role: "user",
              content: `Continue this text with 5 different completions:\n"${request.text}"`
            }
          ];
        }
        
        // Special handling for reasoning models
        const isReasoning = isReasoningModel(modelId);
        logger.log(`🤖 Model ${modelId} is reasoning model: ${isReasoning}`);
        
        if (modelId.includes('o1') || modelId.includes('o3')) {
          logger.log('📌 Using streaming for OpenAI reasoning model to capture content');
          requestBody.stream = true;
          // Don't exclude reasoning - let it flow naturally in the stream
          delete requestBody.reasoning;
        } else if (isReasoning && !modelId.includes('gpt-5')) {
          // For other reasoning models, exclude reasoning
          logger.log('📌 Adding reasoning.exclude for non-OpenAI reasoning model');
          requestBody.reasoning = {
            exclude: true
          };
        }

        logger.log('Request body:', JSON.stringify(requestBody, null, 2));
        
        const requestHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
          'X-Title': 'AI Autocomplete Extension'
        };
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody)
        });

        logger.log('API response status:', response.status);
        
        // Handle streaming response for OpenAI reasoning models
        if (requestBody.stream && response.ok) {
          logger.log('📡 Processing streaming response...');
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }
          
          const decoder = new TextDecoder();
          let buffer = '';
          let fullCompletion = '';
          let skipReasoning = true;  // Flag to skip reasoning chunks
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              
              // Process complete lines from buffer
              while (true) {
                const lineEnd = buffer.indexOf('\n');
                if (lineEnd === -1) break;
                
                const line = buffer.slice(0, lineEnd).trim();
                buffer = buffer.slice(lineEnd + 1);
                
                // Skip comments from OpenRouter
                if (line.startsWith(':')) {
                  logger.log('📌 OpenRouter comment:', line);
                  continue;
                }
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    logger.log('✅ Stream finished');
                    break;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    
                    // Log the entire parsed object structure for debugging
                    logger.log('🔍 Raw parsed chunk:', JSON.stringify(parsed).substring(0, 200));
                    
                    const choice = parsed.choices?.[0];
                    
                    // Check multiple possible locations for content
                    // 1. Standard delta.content
                    const deltaContent = choice?.delta?.content;
                    // 2. Message field (some models use this)
                    const messageContent = choice?.delta?.message?.content;
                    // 3. Text field (older format)
                    const textContent = choice?.delta?.text;
                    // 4. Direct message field
                    const directMessage = choice?.message?.content;
                    
                    // Check for reasoning in various locations
                    const reasoning = choice?.delta?.reasoning || choice?.reasoning;
                    
                    // Combine all possible content sources
                    const content = deltaContent || messageContent || textContent || directMessage;
                    
                    // Log detailed information about what we found
                    logger.log('📊 Found fields:', {
                      hasDeltaContent: deltaContent !== undefined,
                      hasMessageContent: messageContent !== undefined,
                      hasTextContent: textContent !== undefined,
                      hasDirectMessage: directMessage !== undefined,
                      hasReasoning: reasoning !== undefined,
                      content: content ? content.substring(0, 100) : null
                    });
                    
                    // For GPT-5: The actual content appears to be in the reasoning field!
                    // We need to collect the reasoning as it contains the completions
                    if (reasoning !== undefined && reasoning !== null) {
                      logger.log('🧠 GPT-5 reasoning/content chunk:', reasoning ? reasoning.substring(0, 100) : '[empty]');
                      
                      // For GPT-5, the reasoning field contains the actual completions
                      if (reasoning) {
                        fullCompletion += reasoning;
                      }
                    }
                    
                    // Also collect any regular content if it exists
                    if (content !== undefined && content !== null && content !== '') {
                      logger.log('📝 Content found:', content ? `"${content.substring(0, 100)}"` : '[empty string]');
                      
                      // Collect non-empty content
                      if (content) {
                        fullCompletion += content;
                      }
                    }
                    
                    // Check finish reason
                    if (choice?.finish_reason) {
                      logger.log('🏁 Finish reason:', choice.finish_reason);
                      
                      // If we finished but have no content, log the entire final chunk
                      if (!fullCompletion && choice.finish_reason === 'stop') {
                        logger.log('⚠️ Finished with no content. Final chunk:', JSON.stringify(parsed));
                      }
                    }
                    
                  } catch (e) {
                    logger.log('⚠️ Failed to parse chunk:', data.substring(0, 100));
                  }
                }
              }
            }
          } finally {
            reader.cancel();
          }
          
          logger.log('✅ Streaming complete. Full completion length:', fullCompletion.length);
          logger.log('Full completion content:', fullCompletion);
          
          if (fullCompletion && fullCompletion.trim()) {
            // Parse the completion to extract the JSON array
            const completions = extractCompletions(fullCompletion);
            const finalCompletions = ensureFiveCompletions(completions);
            
            logger.log('💬 Completions generated from stream:');
            finalCompletions.forEach((c, i) => {
              logger.log(`  ${i + 1}. ${c.substring(0, 50)}...`);
            });
            
            sendResponse({ completions: finalCompletions, modelUsed: modelId });
            return;
          } else {
            logger.error('❌ No content received from stream');
            logger.log('🔍 Debug: skipReasoning flag was:', skipReasoning);
            logger.log('🔍 Debug: fullCompletion was:', fullCompletion);
            
            // Fallback: Try non-streaming for GPT-5 with different approach
            logger.log('🔄 Attempting fallback: Non-streaming with reasoning included');
            
            // Make a new request without streaming but with reasoning included
            const fallbackBody = { ...requestBody };
            delete fallbackBody.stream;
            delete fallbackBody.reasoning;  // Let reasoning come through
            
            const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: requestHeaders,
              body: JSON.stringify(fallbackBody)
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              logger.log('🔍 Fallback response structure:', JSON.stringify(fallbackData).substring(0, 500));
              
              // Try to extract content from various possible locations
              const message = fallbackData.choices?.[0]?.message;
              const content = message?.content || message?.text || fallbackData.choices?.[0]?.text;
              const reasoning = message?.reasoning || fallbackData.choices?.[0]?.reasoning;
              
              // For GPT-5, the actual completions are in the reasoning field!
              const actualContent = reasoning || content;
              
              if (actualContent) {
                logger.log('✅ Fallback succeeded with content from ' + (reasoning ? 'reasoning' : 'content') + ' field:', actualContent.substring(0, 200));
                const completions = extractCompletions(actualContent);
                const finalCompletions = ensureFiveCompletions(completions);
                sendResponse({ completions: finalCompletions, modelUsed: modelId });
                return;
              }
            }
            
            sendResponse({ error: 'Model returned empty completion. Try a different model.' });
            return;
          }
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error('API response error:', errorText);
          
          let userMessage = "Failed to generate completion. Please try again.";
          let errorType = 'api_error';
          
          // Parse error if possible for better user feedback
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              logger.error('API Error details:', errorData.error);
              
              // Handle specific error types
              if (errorData.error.code === 401 || errorData.error.message?.toLowerCase().includes('unauthorized')) {
                userMessage = "Invalid API key. Please check your OpenRouter API key in the extension settings.";
                errorType = 'unauthorized';
              } else if (errorData.error.code === 402 || errorData.error.message?.toLowerCase().includes('insufficient')) {
                userMessage = "Insufficient credits. Please add credits to your OpenRouter account.";
                errorType = 'insufficient_credits';
              } else if (errorData.error.code === 429 || errorData.error.message?.toLowerCase().includes('rate limit')) {
                userMessage = "Rate limit exceeded. Please wait a moment and try again.";
                errorType = 'rate_limit';
              } else if (errorData.error.message) {
                // Use the actual error message if it's user-friendly
                userMessage = `Error: ${errorData.error.message}`;
              }
            }
          } catch (e) {
            // Not JSON error, keep default message
            logger.error('Could not parse error response');
          }
          
          // If model fails, try fallback to free model
          if (modelId !== 'google/gemini-2.5-flash-lite') {
            logger.log('Retrying with free fallback model...');
            const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
                'X-Title': 'AI Autocomplete Extension'
              },
              body: JSON.stringify({
                "model": "google/gemini-2.5-flash-lite",
                "messages": [
                  { 
                    "role": "system", 
                    "content": "Continue the following text naturally. Provide only the continuation." 
                  },
                  { 
                    "role": "user", 
                    "content": request.text 
                  }
                ],
                "temperature": temperature,
                "max_tokens": maxTokens,
                "reasoning": { exclude: true }  // Exclude reasoning for fallback
              })
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              logger.log('Fallback response data:', fallbackData);
              const completion = fallbackData.choices[0]?.message?.content || '';
              
              if (completion) {
                sendResponse({ completion, modelUsed: 'google/gemini-2.5-flash-lite (fallback)', usedFallback: true });
              } else {
                sendResponse({ 
                  error: 'Empty response from fallback model',
                  errorType: 'empty_response',
                  userMessage: 'Failed to generate completion. Please try again.'
                });
              }
              return;
            } else {
              // Fallback also failed
              sendResponse({ 
                error: userMessage,
                errorType: errorType,
                userMessage: userMessage
              });
              return;
            }
          }
          
          // Primary model failed and no fallback attempted
          sendResponse({ 
            error: userMessage,
            errorType: errorType,
            userMessage: userMessage
          });
          return;
        }

        const data = await response.json();
        logger.log('✅ Full API Response:', JSON.stringify(data, null, 2));
        logger.log('Model used in response:', data.model || modelId);
        
        // Handle different response structures
        let completion = '';
        if (data.choices && data.choices.length > 0) {
          const choice = data.choices[0];
          
          // Standard content field extraction
          completion = choice?.message?.content || '';
          
          // Check for structured output response
          if (hasStructuredOutput && completion) {
            try {
              const parsed = JSON.parse(completion);
              if (parsed.completions && Array.isArray(parsed.completions)) {
                logger.log('✅ Structured output parsed successfully');
                // Already in the right format
              }
            } catch (e) {
              logger.log('⚠️ Failed to parse structured output as JSON');
            }
          }
          
          // Check for Gemini models that return thinking in reasoning field
          if (modelId.includes('gemini') && !completion && choice?.message?.reasoning) {
            logger.log('🔍 Gemini model - reasoning field contains thinking, not completions');
            // Gemini puts its thinking in reasoning field, not actual completions
            // We should NOT use the reasoning field for Gemini
            // The actual completions should be in content field
            // If content is empty, we need to retry or handle differently
          }
          
          // Check for GPT-5 encrypted reasoning
          if (modelId.includes('gpt-5') && !completion) {
            logger.log('🔍 Checking for GPT-5 encrypted reasoning');
            
            // Check for encrypted reasoning details
            const hasEncryptedReasoning = choice?.message?.reasoning_details?.some(
              (detail: any) => detail.type === 'reasoning.encrypted'
            );
            
            if (hasEncryptedReasoning) {
              logger.log('🔐 Encrypted reasoning detected for GPT-5');
              // GPT-5 returns encrypted reasoning and empty content
              // We'll let the retry logic handle this with a simpler prompt
              logger.log('⚠️ GPT-5 returned encrypted reasoning with no content - will retry');
              // Set completion to empty to trigger retry
              completion = '';
            }
          }
          
          // Check for encrypted reasoning (other OpenAI models)
          const hasEncryptedReasoning = choice?.message?.reasoning_details?.some(
            (detail: any) => detail.type === 'reasoning.encrypted'
          );
          
          if (hasEncryptedReasoning && !completion && !modelId.includes('gpt-5')) {
            logger.log('🔐 Encrypted reasoning detected with empty content');
            // OpenAI reasoning models need special handling
            // Their reasoning is encrypted and content may not be accessible
            // This is a known limitation of GPT-5 and o-series models
          }
          
          // Check if this is a reasoning model response with reasoning field
          // BUT NOT for Gemini - Gemini's reasoning is thinking, not completions
          if (!completion && choice?.message?.reasoning && !modelId.includes('gemini')) {
            logger.log('🤔 Non-Gemini reasoning model returned reasoning field');
            // Try to extract completions from reasoning text
            const reasoningText = choice.message.reasoning;
            
            // Look for JSON array in the reasoning
            const jsonMatches = reasoningText.match(/\[[\s\S]*?\]/g);
            if (jsonMatches) {
              for (const match of jsonMatches) {
                try {
                  const parsed = JSON.parse(match);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    completion = match; // Use the JSON array as completion
                    logger.log('📋 Extracted completions from reasoning field');
                    break;
                  }
                } catch (e) {
                  // Not valid JSON, continue
                }
              }
            }
          }
          
          // Fallback to text field for some older models
          if (!completion) {
            completion = choice?.text || '';
          }
          
          // Some models might have the completion in a different field
          if (!completion && choice?.message?.completion) {
            completion = choice.message.completion;
            logger.log('📝 Extracted from completion field');
          }
        }
        
        // Check if completion is empty
        if (!completion || completion.trim() === '') {
          logger.warn('⚠️ Empty completion received from model');
          logger.log('Full response data:', data);
          
          // Try with a simpler numbered list prompt format
          logger.log('Retrying with simplified numbered list format...');
          const retryBody: any = {
            "model": modelId,
            "messages": [
              {
                "role": "system",
                "content": getNumberedListPrompt(completionMode)
              },
              { 
                "role": "user", 
                "content": `Continue this text with 5 different completions:\n"${request.text}"`
              }
            ],
            "temperature": temperature,
            "max_tokens": maxTokens
          };
          
          // Add reasoning exclusion for reasoning models (except GPT-5 which needs special handling)
          if (isReasoning && !modelId.includes('gpt-5')) {
            retryBody.reasoning = { exclude: true };
          }
          
          const retryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
              'X-Title': 'AI Autocomplete Extension'
            },
            body: JSON.stringify(retryBody)
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            logger.log('Retry response:', retryData);
            completion = retryData.choices[0]?.message?.content || '';
            
            // If still no completion and this isn't already the fallback model, try fallback
            if (!completion && modelId !== 'google/gemini-2.5-flash-lite') {
              logger.log('🔄 Retry failed, attempting with fallback model...');
              
              const fallbackBody = {
                "model": "google/gemini-2.5-flash-lite",
                "messages": [
                  {
                    "role": "system",
                    "content": getNumberedListPrompt(completionMode)
                  },
                  {
                    "role": "user",
                    "content": `Continue this text with 5 different completions:\n"${request.text}"`
                  }
                ],
                "temperature": temperature,
                "max_tokens": maxTokens,
                "reasoning": { exclude: true }
              };
              
              const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(fallbackBody)
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                logger.log('✅ Fallback model response:', fallbackData);
                completion = fallbackData.choices[0]?.message?.content || '';
                if (completion) {
                  logger.log('📝 Using fallback model completions');
                }
              }
            }
          }
        }
        
        // Try to parse multiple completions from response
        let completions: string[] = [];
        
        if (completion) {
          // Check if this is a structured output response
          if (hasStructuredOutput) {
            try {
              const parsed = JSON.parse(completion);
              if (parsed.completions && Array.isArray(parsed.completions)) {
                completions = parsed.completions;
                logger.log('✅ Extracted completions from structured output');
              }
            } catch (e) {
              logger.log('⚠️ Failed to parse structured output, falling back to extraction');
              completions = extractCompletions(completion);
            }
          }
          // Check if this is numbered format (used by default now for non-structured models)
          else if (useNumberedFormat || completion.includes('1.')) {
            logger.log('📝 Parsing numbered list format');
            const lines = completion.split('\n').filter(line => line.trim());
            completions = lines.map(line => {
              // Remove numbering (1., 2., etc.) and any leading/trailing quotes
              return line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim();
            }).filter(c => c.length > 0);
            
            // If we didn't get enough completions, try other extraction methods
            if (completions.length < 2) {
              logger.log('⚠️ Numbered format parsing yielded few results, trying extraction');
              completions = extractCompletions(completion);
            }
          } else {
            // Use our robust extraction function for other cases
            completions = extractCompletions(completion);
          }
          
          // Ensure we always have 5 completions
          completions = ensureFiveCompletions(completions);
          
          // Clean up completions
          completions = completions.map(c => {
            // Remove leading/trailing whitespace
            let cleaned = c.trim();
            
            // Remove common prefixes that models might add
            cleaned = cleaned.replace(/^(completion \d+:|option \d+:|here'?s? (a|another) completion:)/i, '');
            
            // Remove surrounding quotes if the entire completion is quoted
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
              cleaned = cleaned.slice(1, -1);
            }
            
            return cleaned.trim();
          }).filter(c => c.length > 0);
          
          if (completions.length > 0) {
            logger.log('💬 Completions generated:');
            completions.forEach((c, i) => {
              logger.log(`  ${i + 1}. ${c.substring(0, 50)}...`);
            });
            logger.log('=============== REQUEST COMPLETE ===============\n');
            sendResponse({ completions, modelUsed: modelId });
          } else {
            logger.error('❌ No valid completions extracted');
            // Fallback: return the original text as a single completion
            sendResponse({ completions: [completion], modelUsed: modelId });
          }
        } else {
          logger.error('❌ No completion generated');
          sendResponse({ error: 'Model returned empty completion. Try a different model or adjust settings.' });
        }

      } catch (error: any) {
        logger.error('❌ Error in background script:', error);
        sendResponse({ error: error.message });
      }
    });
    }); // End of consent check
    return true;
  }
  
  // Handle request for rewriting selected text
  if (request.type === "GET_CHAT_RESPONSE") {
    logger.log('Processing GET_CHAT_RESPONSE request');
    
    // Check consent before processing any API requests
    checkHasConsented().then(async (hasConsent) => {
      if (!hasConsent) {
        logger.error('User has not consented, blocking API request');
        sendResponse({ error: 'Privacy consent required. Please complete the consent process.' });
        return;
      }
      
      // Get encrypted API key first
      const apiKey = await retrieveApiKey();
      
      chrome.storage.sync.get(['selectedModel', 'modelSettings', 'customSystemPrompt'], async (result) => {
        logger.log('=============== CHAT REQUEST ===============');
        logger.log('Retrieved settings from storage');
        logger.log('🚀 ACTIVE MODEL:', result.selectedModel || 'google/gemini-2.5-flash-lite');
        logger.log('Temperature:', result.modelSettings?.temperature || 0.7);
        
        if (!apiKey) {
          const errorMsg = "⚠️ No API key found. Please click the extension icon and enter your OpenRouter API key.";
          logger.error(errorMsg);
          sendResponse({ 
            error: errorMsg,
            errorType: 'missing_api_key'
          });
          return;
        }
        
        // Basic API key validation
        if (apiKey.length < 20 || !apiKey.startsWith('sk-')) {
          const errorMsg = "⚠️ Invalid API key format. OpenRouter API keys should start with 'sk-' and be at least 20 characters long.";
          logger.error(errorMsg);
          sendResponse({ 
            error: errorMsg,
            errorType: 'invalid_api_key'
          });
          return;
        }
        
        const modelId = result.selectedModel || 'google/gemini-2.5-flash-lite';
        const temperature = result.modelSettings?.temperature || 0.7;
        const maxTokens = result.modelSettings?.maxTokens || 500;
        
        logger.log('💬 Chat message:', request.message);
        logger.log('📊 Message length:', request.message.length, 'characters');
        
        // Build the request headers
        const requestHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `chrome-extension://${chrome.runtime.id}`,
          'X-Title': 'AI Autocomplete Extension'
        };
        
        // Build messages array - only include system prompt if user has custom prompt
        const messages: any[] = [];
        
        // Only add system prompt if user has explicitly set a custom prompt
        if (result.customSystemPrompt && result.customSystemPrompt.trim()) {
          logger.log('🎯 Using custom system prompt for chat');
          messages.push({ role: "system", content: result.customSystemPrompt.trim() });
        } else {
          logger.log('🎯 No system prompt for chat (better for natural responses)');
        }
        
        messages.push({ role: "user", content: request.message });
        
        const requestBody = {
          model: modelId,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        };
        
        logger.log('📤 Sending chat request to OpenRouter...');
        logger.log('Model:', modelId);
        
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody)
          });
          
          logger.log('📥 Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            logger.error('API Error Response:', errorText);
            
            let userMessage = 'Failed to get chat response. ';
            
            if (response.status === 401 || response.status === 403) {
              userMessage = 'Invalid API key. Please check your OpenRouter API key in settings.';
            } else if (response.status === 402) {
              userMessage = 'Insufficient credits. Please add credits to your OpenRouter account.';
            } else if (response.status === 429) {
              userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            } else {
              userMessage += `Error: ${response.status}`;
            }
            
            sendResponse({ error: userMessage });
            return;
          }
          
          const data = await response.json();
          logger.log('✅ Chat response received');
          
          // Log the full response structure to debug Gemini issues
          logger.log('📊 Full response data:', JSON.stringify(data, null, 2));
          
          // Extract chat response - handle reasoning models
          let chatResponse = '';
          
          if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            const message = choice?.message;
            
            // Log what fields are present in the message
            logger.log('📋 Message fields present:', {
              hasContent: !!message?.content,
              contentPreview: message?.content?.substring(0, 100),
              hasReasoning: !!message?.reasoning,
              reasoningPreview: message?.reasoning?.substring(0, 100),
              hasText: !!choice?.text,
              textPreview: choice?.text?.substring(0, 100)
            });
            
            // First try to get content from the standard field
            chatResponse = message?.content || choice?.text || '';
            
            // For GPT-5 and other reasoning models, check the reasoning field
            if (!chatResponse && message?.reasoning) {
              logger.log('🤔 Reasoning model detected - checking reasoning field');
              
              // For GPT-5, the reasoning field contains thinking, NOT the actual response
              // We should NOT use it as the chat response
              if (modelId.includes('gpt-5')) {
                logger.log('🔍 GPT-5: Reasoning field contains thinking process, not response');
                logger.log('📋 GPT-5 reasoning preview:', message.reasoning?.substring(0, 200));
                // Don't use reasoning as response for GPT-5 in chat
                // Will trigger fallback below
              } else if (!modelId.includes('gemini')) {
                // For other reasoning models (not Gemini), use reasoning field
                chatResponse = message.reasoning;
                logger.log('📋 Extracted response from reasoning field');
              }
            }
            
            // For GPT-5: Always use fallback model since it returns empty content
            if (!chatResponse && modelId.includes('gpt-5')) {
              logger.log('🔄 GPT-5 returned empty content, using fallback model');
              
              // Check if there's encrypted reasoning (for logging purposes)
              const reasoningDetails = message?.reasoning_details;
              if (reasoningDetails && Array.isArray(reasoningDetails)) {
                const hasEncrypted = reasoningDetails.some((detail: any) => 
                  detail.type === 'reasoning.encrypted'
                );
                if (hasEncrypted) {
                  logger.log('🔐 GPT-5 has encrypted reasoning');
                }
              }
              
              // Always use fallback model for GPT-5 chat responses
              try {
                logger.log('📤 Making fallback request with Gemini...');
                const fallbackBody = {
                  model: 'google/gemini-2.5-flash-lite', // Use reliable fallback model
                  messages: messages, // Use the same messages array (with or without system prompt)
                  temperature: temperature,
                  max_tokens: maxTokens
                };
                
                const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: requestHeaders,
                  body: JSON.stringify(fallbackBody)
                });
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  const fallbackContent = fallbackData.choices?.[0]?.message?.content || 
                                           fallbackData.choices?.[0]?.text;
                  if (fallbackContent) {
                    chatResponse = fallbackContent;
                    logger.log('✅ Fallback model (Gemini) provided response');
                  } else {
                    logger.error('Fallback model returned empty response');
                  }
                } else {
                  const errorText = await fallbackResponse.text();
                  logger.error('Fallback request failed:', errorText);
                }
              } catch (fallbackError) {
                logger.error('Fallback request error:', fallbackError);
                chatResponse = "I apologize, but I'm having trouble processing your request. Please try again or switch to a different model.";
              }
            }
          }
          
          if (!chatResponse) {
            logger.error('No content in response:', JSON.stringify(data));
            sendResponse({ error: 'No response generated. Please try again with a different model.' });
            return;
          }
          
          logger.log('💬 Chat response:', chatResponse.substring(0, 200) + '...');
          sendResponse({ response: chatResponse });
          
        } catch (error) {
          logger.error('Network error during chat request:', error);
          sendResponse({ error: 'Network error. Please check your connection and try again.' });
        }
      });
    }).catch(error => {
      logger.error('Error checking consent:', error);
      sendResponse({ error: 'Failed to verify consent status. Please refresh the page.' });
    });
    
    return true; // Keep message channel open for async response
  }
  
  if (request.type === "GET_REWRITE") {
    logger.log('Processing GET_REWRITE request');
    
    // Check consent before processing any API requests
    checkHasConsented().then(async (hasConsent) => {
      if (!hasConsent) {
        logger.error('User has not consented, blocking API request');
        sendResponse({ error: 'Privacy consent required. Please complete the consent process.' });
        return;
      }
      
      // Get encrypted API key first
      const apiKey = await retrieveApiKey();
      
      chrome.storage.sync.get(['selectedModel', 'modelSettings', 'customSystemPrompt'], async (result) => {
        logger.log('=============== REWRITE REQUEST ===============');
        logger.log('Retrieved settings from storage');
        logger.log('🚀 ACTIVE MODEL:', result.selectedModel || 'google/gemini-2.5-flash-lite');
        logger.log('Temperature:', result.modelSettings?.temperature || 0.7);
        
        if (!apiKey) {
          const errorMsg = "⚠️ No API key found. Please click the extension icon and enter your OpenRouter API key.";
          logger.error(errorMsg);
          sendResponse({ 
            error: errorMsg,
            errorType: 'missing_api_key',
            userMessage: "No API key configured. Click the AI Autocomplete extension icon to add your OpenRouter API key."
          });
          return;
        }
        
        // Basic API key validation
        if (apiKey.length < 20 || !apiKey.startsWith('sk-')) {
          const errorMsg = "⚠️ Invalid API key format. OpenRouter API keys should start with 'sk-' and be at least 20 characters long.";
          logger.error(errorMsg);
          sendResponse({ 
            error: errorMsg,
            errorType: 'invalid_api_key',
            userMessage: "Invalid API key. Please check your OpenRouter API key in the extension settings."
          });
          return;
        }
        
        const modelId = result.selectedModel || 'google/gemini-2.5-flash-lite';
        const temperature = result.modelSettings?.temperature || 0.7;
        // Use a fixed token limit for rewrites (roughly maintains same length)
        const maxTokens = 300;
        
        logger.log('📝 Text to rewrite:', request.text);
        logger.log('📊 Text length:', request.text.length, 'characters');
        
        try {
          logger.log('🌐 Calling OpenRouter API for rewrite...');
          
          // Get the rewrite prompt with optional custom system prompt
          const rewritePrompt = getRewriteSystemPrompt(result.customSystemPrompt);
          logger.log('📝 Using rewrite prompt with custom preferences:', !!result.customSystemPrompt);
          
          const messages = [
            { 
              "role": "system", 
              "content": rewritePrompt
            },
            { 
              "role": "user", 
              "content": `Rewrite this text in 3 different ways:\n"${request.text}"`
            }
          ];
          
          // Check if this is a reasoning model
          const isReasoning = isReasoningModel(modelId);
          
          const requestBody: any = {
            "model": modelId,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": maxTokens
          };
          
          // For reasoning models (except GPT-5), exclude reasoning to get actual content
          if (isReasoning && !modelId.includes('gpt-5')) {
            requestBody.reasoning = { exclude: true };
          }
          
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
              'X-Title': 'AI Autocomplete Extension'
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            logger.error('❌ API Error:', errorText);
            
            let errorMessage = 'Failed to rewrite text. ';
            if (response.status === 401) {
              errorMessage = 'Invalid API key. Please check your OpenRouter settings.';
            } else if (response.status === 402) {
              errorMessage = 'Insufficient credits in your OpenRouter account.';
            } else if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Please try again later.';
            } else {
              errorMessage += `Error: ${response.status}`;
            }
            
            sendResponse({ 
              error: errorMessage,
              errorType: 'api_error',
              userMessage: errorMessage
            });
            return;
          }
          
          const data = await response.json();
          logger.log('✅ Full API Response:', JSON.stringify(data, null, 2));
          
          // Extract the rewritten text
          let rewriteText = '';
          if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            rewriteText = choice?.message?.content || '';
            
            // Check if Gemini returned thinking in reasoning field
            if (modelId.includes('gemini') && !rewriteText && choice?.message?.reasoning) {
              logger.log('🔍 Gemini returned reasoning/thinking, not rewrites - will retry');
              // Don't use Gemini's reasoning field - it contains thinking, not rewrites
              rewriteText = ''; // Keep empty to trigger retry
            }
            // Check if other reasoning models returned reasoning field
            else if (!rewriteText && choice?.message?.reasoning && !modelId.includes('gemini')) {
              logger.log('🤔 Non-Gemini reasoning model returned reasoning field for rewrite');
              // Try to extract from reasoning
              const reasoningText = choice.message.reasoning;
              
              // Look for JSON array in the reasoning
              const jsonMatches = reasoningText.match(/\[[\s\S]*?\]/g);
              if (jsonMatches) {
                for (const match of jsonMatches) {
                  try {
                    const parsed = JSON.parse(match);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      rewriteText = match;
                      logger.log('📋 Extracted rewrites from reasoning field');
                      break;
                    }
                  } catch (e) {
                    // Not valid JSON, continue
                  }
                }
              }
            }
            
            // Check for GPT-5 encrypted reasoning
            if (modelId.includes('gpt-5') && !rewriteText) {
              const hasEncryptedReasoning = choice?.message?.reasoning_details?.some(
                (detail: any) => detail.type === 'reasoning.encrypted'
              );
              
              if (hasEncryptedReasoning) {
                logger.log('🔐 GPT-5 encrypted reasoning detected - will retry');
                rewriteText = ''; // Keep empty to trigger retry
              }
            }
          }
          
          // If no rewrite text, try with simpler prompt
          if (!rewriteText || rewriteText.trim() === '') {
            logger.log('⚠️ Empty rewrite received, retrying with simpler prompt...');
            
            const retryBody: any = {
              "model": modelId,
              "messages": [
                {
                  "role": "system",
                  "content": "Rewrite the given text in 3 different ways. Output each version on a new line, numbered 1-3. Keep similar length and meaning."
                },
                {
                  "role": "user",
                  "content": `Rewrite this text in 3 different ways:\n"${request.text}"`
                }
              ],
              "temperature": temperature,
              "max_tokens": maxTokens
            };
            
            // Add reasoning exclusion for reasoning models (except GPT-5)
            if (isReasoning && !modelId.includes('gpt-5')) {
              retryBody.reasoning = { exclude: true };
            }
            
            const retryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
                'X-Title': 'AI Autocomplete Extension'
              },
              body: JSON.stringify(retryBody)
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              logger.log('Retry response:', retryData);
              rewriteText = retryData.choices[0]?.message?.content || '';
              
              // If still no rewrite and not already using fallback model
              if (!rewriteText && modelId !== 'google/gemini-2.5-flash-lite') {
                logger.log('🔄 Retry failed, using fallback model...');
                
                const fallbackBody = {
                  "model": "google/gemini-2.5-flash-lite",
                  "messages": [
                    {
                      "role": "system",
                      "content": "Rewrite the given text in 3 different ways. Output each version on a new line, numbered 1-3. Keep similar length and meaning."
                    },
                    {
                      "role": "user",
                      "content": `Rewrite this text in 3 different ways:\n"${request.text}"`
                    }
                  ],
                  "temperature": temperature,
                  "max_tokens": maxTokens,
                  "reasoning": { exclude: true }
                };
                
                const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
                    'X-Title': 'AI Autocomplete Extension'
                  },
                  body: JSON.stringify(fallbackBody)
                });
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  logger.log('✅ Fallback model response:', fallbackData);
                  rewriteText = fallbackData.choices[0]?.message?.content || '';
                }
              }
            }
          }
          
          if (rewriteText) {
            logger.log('📝 Raw rewrite response:', rewriteText);
            
            // Parse rewrites - check for numbered format first
            let rewrites: string[] = [];
            
            if (rewriteText.includes('1.')) {
              logger.log('📝 Parsing numbered rewrite format');
              const lines = rewriteText.split('\n').filter(line => line.trim());
              rewrites = lines.map(line => {
                // Remove numbering (1., 2., etc.) and quotes
                return line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim();
              }).filter(r => r.length > 0);
            }
            
            // If not enough rewrites from numbered format, try extraction
            if (rewrites.length < 2) {
              rewrites = extractCompletions(rewriteText);
            }
            
            // Ensure we have exactly 3 rewrites
            const finalRewrites = ensureThreeRewrites(rewrites);
            
            logger.log('💬 Rewrites generated:');
            finalRewrites.forEach((r, i) => {
              logger.log(`  ${i + 1}. ${r.substring(0, 50)}...`);
            });
            
            logger.log('=============== REWRITE COMPLETE ===============\n');
            sendResponse({ rewrites: finalRewrites, modelUsed: modelId });
          } else {
            logger.error('❌ No rewrite generated after retries');
            sendResponse({ error: 'Model returned empty rewrite. Try a different model.' });
          }
          
        } catch (error: any) {
          logger.error('❌ Error in rewrite request:', error);
          sendResponse({ error: error.message });
        }
      });
    }); // End of consent check
    return true;
  }
  
  // Handle request for models list from popup
  if (request.type === "GET_MODELS") {
    fetchAvailableModels().then(models => {
      sendResponse({ models });
    });
    return true;
  }
  
  // Handle requests to inject content script from popup
  if (request.type === 'INJECT_CONTENT_SCRIPT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        const success = await injectContentScript(tabs[0].id);
        sendResponse({ success });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }
  
  // Handle request to reinitialize injection mode
  if (request.type === 'REINITIALIZE_INJECTION_MODE') {
    (async () => {
      try {
        logger.log('Reinitializing injection mode...');
        
        // Reinitialize with new mode (cleanup is handled inside initializeInjectionMode)
        await initializeInjectionMode();
        
        sendResponse({ success: true });
      } catch (error) {
        logger.error('Error reinitializing injection mode:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true;
  }
  
  // Handle developer mode changes
  if (request.type === 'DEVELOPER_MODE_CHANGED') {
    (async () => {
      try {
        logger.log('Developer mode changed:', request.enabled);
        
        // Reinitialize with developer mode setting
        await initializeInjectionMode();
        
        sendResponse({ success: true });
      } catch (error) {
        logger.error('Error handling developer mode change:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true;
  }
  
  // Handle injection mode changes
  if (request.type === 'INJECTION_MODE_CHANGED') {
    (async () => {
      try {
        logger.log('Injection mode changed to:', request.mode);
        
        // Reinitialize with new injection mode
        await initializeInjectionMode();
        
        sendResponse({ success: true });
      } catch (error) {
        logger.error('Error handling injection mode change:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true;
  }
  
  // Handle manual injection request
  if (request.type === 'MANUAL_INJECT_REQUEST') {
    (async () => {
      try {
        logger.log('Manual injection requested');
        
        // Get the current active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || !activeTab.id) {
          logger.error('No active tab found');
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        // Check if already injected
        if (injectedTabs.has(activeTab.id)) {
          logger.log('Content script already injected in tab', activeTab.id);
          sendResponse({ success: true, alreadyInjected: true });
          return;
        }
        
        // Inject the content script
        const success = await injectContentScript(activeTab.id);
        
        if (success) {
          logger.log('Manual injection successful for tab', activeTab.id);
          sendResponse({ success: true });
        } else {
          logger.error('Manual injection failed for tab', activeTab.id);
          sendResponse({ success: false, error: 'Failed to inject content script' });
        }
      } catch (error) {
        logger.error('Error handling manual injection:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true;
  }
});

// Listen for global keyboard commands defined in manifest
chrome.commands.onCommand.addListener(async (command) => {
  logger.log('Command received:', command);
  
  if (command === 'manual-inject') {
    try {
      // Get the current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab || !activeTab.id) {
        logger.error('No active tab found for manual injection');
        return;
      }
      
      // Check if already injected
      if (injectedTabs.has(activeTab.id)) {
        logger.log('Content script already injected, sending notification to show feedback');
        
        // Send message to content script to show it's already active
        try {
          await chrome.tabs.sendMessage(activeTab.id!, { 
            type: 'SHOW_ALREADY_ACTIVE_FEEDBACK' 
          });
        } catch (e) {
          // Content script might not be listening, that's ok
          logger.log('Could not send feedback message to content script');
        }
        return;
      }
      
      // Check consent before injecting
      const hasConsent = await checkHasConsented();
      if (!hasConsent) {
        logger.log('User has not consented, cannot inject via keyboard command');
        // Can't show UI feedback without injecting, so just log
        return;
      }
      
      // Inject the content script
      const success = await injectContentScript(activeTab.id);
      
      if (success) {
        logger.log('Manual injection via keyboard command successful for tab', activeTab.id);
        
        // Send message to show activation feedback
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(activeTab.id!, { 
              type: 'SHOW_ACTIVATION_FEEDBACK' 
            });
          } catch (e) {
            logger.log('Could not send activation feedback');
          }
        }, 100); // Small delay to ensure script is loaded
      } else {
        logger.error('Manual injection via keyboard command failed for tab', activeTab.id);
      }
    } catch (error) {
      logger.error('Error handling manual injection command:', error);
    }
  }
});