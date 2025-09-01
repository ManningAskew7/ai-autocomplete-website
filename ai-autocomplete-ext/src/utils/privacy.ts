/**
 * Privacy Management Module
 * 
 * Handles user consent, privacy preferences, and data management
 * Required for Chrome Web Store compliance with data collection policies
 */

import { logger } from './logger';

export type InjectionMode = 'conservative' | 'balanced' | 'aggressive';

export interface PrivacySettings {
  hasConsented: boolean;
  consentDate?: number;
  enhancedDetection: boolean;
  injectionMode: InjectionMode;
  developerMode?: boolean; // Developer mode for testing with all permissions
  dataCollection: {
    keyboardInput: boolean;
    selectedText: boolean;
    currentUrl: boolean;
    usageStatistics: boolean;
  };
  version: string;
}

export interface UserDataExport {
  settings: PrivacySettings;
  apiKey?: string;
  selectedModel?: string;
  modelSettings?: any;
  customPrompts?: string[];
  keybinds?: any;
  exportDate: string;
  extensionVersion: string;
}

/**
 * Default privacy settings for new users
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  hasConsented: false,
  enhancedDetection: false,
  injectionMode: 'balanced', // New users get balanced mode by default
  developerMode: false, // Default to false for production
  dataCollection: {
    keyboardInput: true, // Required for core functionality
    selectedText: true,  // Required for context
    currentUrl: true,     // Required for better suggestions
    usageStatistics: false // Optional analytics
  },
  version: '1.0.0'
};

/**
 * Injection mode descriptions for user understanding
 */
export const INJECTION_MODE_INFO = {
  conservative: {
    name: 'Conservative (Privacy-First)',
    description: 'Script loads only when you open the popup',
    details: [
      'Minimal browser access',
      'May require opening popup before using Ctrl+Space',
      'Best for privacy-conscious users'
    ],
    permissions: [] as string[],
    hostPermissions: [] as string[],
    warning: false
  },
  balanced: {
    name: 'Balanced (Recommended)',
    description: 'Script loads when you click on a tab or input field',
    details: [
      'Works immediately on most sites',
      'Activates on user interaction',
      'Good balance of privacy and convenience'
    ],
    permissions: ['webNavigation'] as string[],
    hostPermissions: ['https://*/*', 'http://localhost/*'] as string[],
    warning: false
  },
  aggressive: {
    name: 'Aggressive (Maximum Compatibility)',
    description: 'Script loads on all pages automatically',
    details: [
      'Works immediately everywhere',
      'Persists across browser sessions',
      'Higher browser access',
      'Only enable if needed for your workflow'
    ],
    permissions: ['webNavigation', 'tabs'] as string[],
    hostPermissions: ['https://*/*', 'http://localhost/*', 'file:///*'] as string[],
    warning: true
  }
};

/**
 * Check if user has provided consent
 */
export async function checkHasConsented(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(['privacySettings']);
    const settings = result.privacySettings as PrivacySettings;
    return settings?.hasConsented === true;
  } catch (error) {
    logger.error('Error checking consent status:', error);
    return false;
  }
}

/**
 * Save user consent decision
 */
export async function saveConsent(accepted: boolean): Promise<void> {
  try {
    const currentSettings = await getPrivacySettings();
    const updatedSettings: PrivacySettings = {
      ...currentSettings,
      hasConsented: accepted,
      consentDate: accepted ? Date.now() : undefined
    };
    
    await chrome.storage.sync.set({ privacySettings: updatedSettings });
    logger.log(`Consent ${accepted ? 'granted' : 'denied'} and saved`);
    
    // If consent denied, prepare for uninstall
    if (!accepted) {
      await prepareForUninstall();
    }
  } catch (error) {
    logger.error('Error saving consent:', error);
    throw error;
  }
}

/**
 * Get current privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  try {
    const result = await chrome.storage.sync.get(['privacySettings']);
    return result.privacySettings || DEFAULT_PRIVACY_SETTINGS;
  } catch (error) {
    logger.error('Error getting privacy settings:', error);
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
  try {
    const currentSettings = await getPrivacySettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };
    
    await chrome.storage.sync.set({ privacySettings: updatedSettings });
    logger.log('Privacy settings updated:', updatedSettings);
  } catch (error) {
    logger.error('Error updating privacy settings:', error);
    throw error;
  }
}

/**
 * Export all user data for GDPR compliance
 */
export async function exportUserData(): Promise<UserDataExport> {
  try {
    // Get all stored data
    const syncData = await chrome.storage.sync.get(null);
    // const localData = await chrome.storage.local.get(null); // Reserved for future use
    
    // Get manifest for version info
    const manifest = chrome.runtime.getManifest();
    
    const exportData: UserDataExport = {
      settings: syncData.privacySettings || DEFAULT_PRIVACY_SETTINGS,
      apiKey: syncData.apiKey ? '***' + syncData.apiKey.slice(-4) : undefined, // Partially masked
      selectedModel: syncData.selectedModel,
      modelSettings: syncData.modelSettings,
      customPrompts: syncData.customSystemPrompt ? [syncData.customSystemPrompt] : [],
      keybinds: syncData.keybinds,
      exportDate: new Date().toISOString(),
      extensionVersion: manifest.version
    };
    
    logger.log('User data exported successfully');
    return exportData;
  } catch (error) {
    logger.error('Error exporting user data:', error);
    throw error;
  }
}

/**
 * Delete all user data (right to be forgotten)
 */
export async function deleteAllUserData(): Promise<void> {
  try {
    // Clear all storage
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    
    logger.log('All user data deleted');
    
    // Notify user and prepare for uninstall
    await prepareForUninstall();
  } catch (error) {
    logger.error('Error deleting user data:', error);
    throw error;
  }
}

/**
 * Prepare extension for uninstall
 */
async function prepareForUninstall(): Promise<void> {
  try {
    // Clear any sensitive data from memory
    await chrome.storage.sync.remove(['apiKey']);
    
    // Log the event
    logger.log('Extension prepared for uninstall');
    
    // Open uninstall survey page (optional)
    // chrome.tabs.create({ url: 'https://example.com/uninstall-survey' });
  } catch (error) {
    logger.error('Error preparing for uninstall:', error);
  }
}

/**
 * Check if this is the first installation
 */
export async function isFirstInstall(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(['privacySettings', 'installDate']);
    return !result.privacySettings && !result.installDate;
  } catch (error) {
    logger.error('Error checking first install:', error);
    return true; // Assume first install on error to show consent
  }
}

/**
 * Mark installation date
 */
export async function markInstallDate(): Promise<void> {
  try {
    const installDate = Date.now();
    await chrome.storage.sync.set({ installDate });
    logger.log('Install date marked:', new Date(installDate).toISOString());
  } catch (error) {
    logger.error('Error marking install date:', error);
  }
}

/**
 * Get current injection mode
 */
export async function getInjectionMode(): Promise<InjectionMode> {
  try {
    const settings = await getPrivacySettings();
    return settings.injectionMode || 'conservative'; // Default to conservative for existing users
  } catch (error) {
    logger.error('Error getting injection mode:', error);
    return 'conservative';
  }
}

/**
 * Set injection mode and request necessary permissions
 */
export async function setInjectionMode(mode: InjectionMode): Promise<boolean> {
  try {
    const modeInfo = INJECTION_MODE_INFO[mode];
    
    // Request permissions and origins separately for better compatibility
    let permissionsGranted = true;
    let originsGranted = true;
    
    // Request regular permissions if needed
    if (modeInfo.permissions.length > 0) {
      logger.log('Requesting permissions:', modeInfo.permissions);
      try {
        permissionsGranted = await chrome.permissions.request({
          permissions: modeInfo.permissions as any
        });
        logger.log('Permissions granted:', permissionsGranted);
      } catch (error) {
        logger.error('Error requesting permissions:', error);
        permissionsGranted = false;
      }
    }
    
    // Request host permissions (origins) if needed
    if (modeInfo.hostPermissions && modeInfo.hostPermissions.length > 0) {
      logger.log('Requesting host permissions:', modeInfo.hostPermissions);
      try {
        originsGranted = await chrome.permissions.request({
          origins: modeInfo.hostPermissions
        });
        logger.log('Host permissions granted:', originsGranted);
      } catch (error) {
        logger.error('Error requesting host permissions:', error);
        originsGranted = false;
      }
    }
    
    // Only save the mode if all permissions were granted
    if (!permissionsGranted || !originsGranted) {
      logger.warn('User denied some permissions for injection mode:', mode, {
        permissions: permissionsGranted,
        origins: originsGranted
      });
      return false;
    }
    
    // Update settings only after permissions are granted
    const settings = await getPrivacySettings();
    settings.injectionMode = mode;
    await chrome.storage.sync.set({ privacySettings: settings });
    
    logger.log('Injection mode successfully set to:', mode);
    
    // Notify background script to reinitialize with new mode
    try {
      await chrome.runtime.sendMessage({ 
        type: 'INJECTION_MODE_CHANGED',
        mode: mode 
      });
    } catch (error) {
      // Background script might not be ready, but settings are saved
      logger.warn('Could not notify background of mode change:', error);
    }
    
    return true;
  } catch (error) {
    logger.error('Error setting injection mode:', error);
    return false;
  }
}

/**
 * Check if permissions are granted for a specific injection mode
 */
export async function checkInjectionModePermissions(mode: InjectionMode): Promise<boolean> {
  try {
    const modeInfo = INJECTION_MODE_INFO[mode];
    
    // Check permissions and origins separately
    let hasPermissions = true;
    let hasOrigins = true;
    
    // Check regular permissions
    if (modeInfo.permissions.length > 0) {
      hasPermissions = await chrome.permissions.contains({
        permissions: modeInfo.permissions as any
      });
    }
    
    // Check host permissions
    if (modeInfo.hostPermissions && modeInfo.hostPermissions.length > 0) {
      hasOrigins = await chrome.permissions.contains({
        origins: modeInfo.hostPermissions
      });
    }
    
    logger.log(`Permissions check for ${mode} mode:`, { hasPermissions, hasOrigins });
    
    return hasPermissions && hasOrigins;
  } catch (error) {
    logger.error('Error checking injection mode permissions:', error);
    return false;
  }
}

/**
 * Get privacy policy URL
 */
export function getPrivacyPolicyUrl(): string {
  return 'https://manningaskew7.github.io/ai-autocomplete-website/privacy.html';
}

/**
 * Get terms of service URL
 */
export function getTermsOfServiceUrl(): string {
  return 'https://manningaskew7.github.io/ai-autocomplete-website/terms.html';
}

/**
 * Check if enhanced detection (keyboard buffer) is enabled
 */
export async function isEnhancedDetectionEnabled(): Promise<boolean> {
  try {
    const settings = await getPrivacySettings();
    return settings.enhancedDetection === true;
  } catch (error) {
    logger.error('Error checking enhanced detection:', error);
    return false;
  }
}

/**
 * Check if developer mode is enabled
 */
export async function isDeveloperModeEnabled(): Promise<boolean> {
  try {
    const settings = await getPrivacySettings();
    return settings.developerMode === true;
  } catch (error) {
    logger.error('Error checking developer mode:', error);
    return false;
  }
}

/**
 * Toggle developer mode
 */
export async function toggleDeveloperMode(enabled: boolean): Promise<void> {
  try {
    await updatePrivacySettings({ developerMode: enabled });
    
    // Notify background script to reinitialize
    chrome.runtime.sendMessage({ 
      type: 'DEVELOPER_MODE_CHANGED',
      enabled 
    }).catch(() => {
      // Background script might not be ready
    });
    
    logger.log(`Developer mode ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('Error toggling developer mode:', error);
    throw error;
  }
}

/**
 * Toggle enhanced detection (keyboard buffer)
 */
export async function toggleEnhancedDetection(enabled: boolean): Promise<void> {
  try {
    await updatePrivacySettings({ enhancedDetection: enabled });
    
    // Notify content scripts of the change
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'ENHANCED_DETECTION_CHANGED',
          enabled
        }).catch(() => {
          // Tab might not have content script, ignore error
        });
      }
    }
    
    logger.log(`Enhanced detection ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('Error toggling enhanced detection:', error);
    throw error;
  }
}