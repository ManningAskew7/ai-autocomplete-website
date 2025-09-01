/**
 * Premium Features Management
 * 
 * This module handles premium user status checks and feature gating.
 * Uses ExtensionPay (ExtPay) for subscription management.
 * 
 * Documentation: https://extensionpay.com/docs
 */

import { logger } from './logger';
import { 
  checkPremiumStatus as checkExtPayStatus,
  openPaymentPage as openExtPayPage,
  getSubscriptionDetails as getExtPayDetails,
  getExtPayForPopup
} from './licensing';

/**
 * Character limit for custom system prompts (premium feature)
 */
export const CUSTOM_PROMPT_CHAR_LIMIT = 500;

/**
 * Check if the current user has premium access
 * 
 * @returns Promise<boolean> - True if user has premium access
 */
export async function checkPremiumStatus(): Promise<boolean> {
  try {
    // Use the ExtensionPay integration from licensing.ts
    const isPremium = await checkExtPayStatus();
    
    // During development, you can override this for testing
    // Remove this override for production
    logger.log('Premium status check:', isPremium);
    // Uncomment the next line to treat all users as premium during development
    // return true;
    
    return isPremium;
  } catch (error) {
    logger.error('Error checking premium status:', error);
    return false; // Default to free tier on error
  }
}

/**
 * Open the payment page for upgrading to premium
 * This should be called from popup context
 * 
 * @param fromPopup - Whether this is being called from popup context
 */
export async function openPaymentPage(fromPopup: boolean = false): Promise<void> {
  try {
    if (fromPopup) {
      // In popup context, we need to create a new ExtPay instance
      const extpay = getExtPayForPopup();
      await openExtPayPage(extpay);
    } else {
      // In background context, use the existing instance
      await openExtPayPage();
    }
  } catch (error) {
    logger.error('Failed to open payment page:', error);
    // Fallback to ExtensionPay website
    window.open('https://extensionpay.com', '_blank');
  }
}

/**
 * Get user subscription details
 * 
 * @returns Subscription details from ExtensionPay
 */
export async function getSubscriptionDetails(): Promise<{
  isPremium: boolean;
  planName: string;
  expiresAt?: Date;
  trialDaysRemaining?: number;
  email?: string;
}> {
  try {
    const details = await getExtPayDetails();
    
    if (!details) {
      // Fallback if ExtPay is not available
      return {
        isPremium: false,
        planName: 'Free'
      };
    }
    
    return {
      isPremium: details.isPremium,
      planName: details.planName,
      expiresAt: details.nextBillingDate,
      trialDaysRemaining: details.trialDaysRemaining,
      email: details.email
    };
  } catch (error) {
    logger.error('Error getting subscription details:', error);
    return {
      isPremium: false,
      planName: 'Free'
    };
  }
}

/**
 * Validate custom prompt against premium restrictions
 * 
 * @param prompt - The custom prompt to validate
 * @param isPremium - Whether the user has premium access
 * @returns Object with validation result and error message if any
 */
export function validateCustomPrompt(prompt: string, isPremium: boolean): {
  isValid: boolean;
  error?: string;
} {
  // Check if custom prompts are allowed for this user
  if (!isPremium && prompt.trim().length > 0) {
    return {
      isValid: false,
      error: 'Custom prompts are a premium feature. Upgrade to unlock!'
    };
  }
  
  // Check character limit
  if (prompt.length > CUSTOM_PROMPT_CHAR_LIMIT) {
    return {
      isValid: false,
      error: `Custom prompt exceeds ${CUSTOM_PROMPT_CHAR_LIMIT} character limit`
    };
  }
  
  return { isValid: true };
}

/**
 * Premium feature flags
 * Centralized place to check which features are premium
 */
export const PREMIUM_FEATURES = {
  customPrompts: true,
  promptTemplates: true, // Future feature
  usageAnalytics: true, // Future feature
  prioritySupport: true,
  extendedContext: true, // Future feature
} as const;

/**
 * Example prompt templates for premium users
 * TODO: Move to a separate templates file when implementing
 */
export const PROMPT_TEMPLATES = [
  {
    name: 'Professional',
    prompt: 'Use formal, professional language with clear and concise phrasing.',
    category: 'tone'
  },
  {
    name: 'Creative',
    prompt: 'Be creative, descriptive, and use vivid language with interesting word choices.',
    category: 'tone'
  },
  {
    name: 'Technical',
    prompt: 'Use precise technical terminology and focus on accuracy and detail.',
    category: 'tone'
  },
  {
    name: 'Casual',
    prompt: 'Write in a friendly, conversational tone as if talking to a friend.',
    category: 'tone'
  },
  {
    name: 'British English',
    prompt: 'Use British English spelling and vocabulary (e.g., colour, centre, whilst).',
    category: 'locale'
  },
  {
    name: 'Academic',
    prompt: 'Write in an academic style with formal vocabulary and structured arguments.',
    category: 'tone'
  }
];