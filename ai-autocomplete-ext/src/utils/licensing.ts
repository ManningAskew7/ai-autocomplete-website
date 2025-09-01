/**
 * ExtensionPay Licensing Integration
 * 
 * This module handles premium subscriptions and payment processing
 * using ExtensionPay (ExtPay) service.
 * 
 * ExtensionPay handles all payment processing, subscription management,
 * and license validation without requiring a backend server.
 * 
 * Documentation: https://extensionpay.com/docs
 */

import ExtPay from 'extpay';
import { logger } from './logger';

/**
 * Initialize ExtPay with your extension ID
 * 
 * IMPORTANT: Replace 'ai-autocomplete-extension' with your actual ExtensionPay ID
 * You'll get this ID when you register your extension at https://extensionpay.com
 * 
 * The ID should match what you configure in the ExtensionPay dashboard
 */
const EXTENSION_ID = 'ai-autocomplete-extension'; // TODO: Replace with your actual ExtensionPay ID

// Initialize ExtPay instance
let extpayInstance: any = null;

/**
 * Initialize ExtPay instance
 * This should be called once when the extension starts
 */
export async function initializeExtPay(): Promise<void> {
  try {
    extpayInstance = ExtPay(EXTENSION_ID);
    await extpayInstance.startBackground();
    logger.log('ExtensionPay initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize ExtensionPay:', error);
    // Don't throw - extension should work in free mode if payment fails
  }
}

/**
 * Get the ExtPay instance for popup context
 * Popup context requires different initialization than background
 */
export function getExtPayForPopup() {
  return ExtPay(EXTENSION_ID);
}

/**
 * Check if the current user has premium access
 * 
 * @returns Promise<boolean> - True if user has active premium subscription
 */
export async function checkPremiumStatus(): Promise<boolean> {
  try {
    if (!extpayInstance) {
      logger.warn('ExtPay not initialized, treating as free user');
      return false;
    }

    const user = await extpayInstance.getUser();
    
    // Check if user has paid
    const isPremium = user.paid === true;
    
    // Log subscription status for debugging
    if (isPremium) {
      logger.log('User has premium subscription', {
        email: user.email,
        trialStartedAt: user.trialStartedAt,
        subscriptionStatus: user.subscriptionStatus
      });
    }
    
    return isPremium;
  } catch (error) {
    logger.error('Error checking premium status:', error);
    return false; // Default to free tier on error
  }
}

/**
 * Open the payment page for upgrading to premium
 * This should be called from the popup context
 * 
 * @param extpay - ExtPay instance from popup context
 */
export async function openPaymentPage(extpay?: any): Promise<void> {
  try {
    const instance = extpay || extpayInstance;
    if (!instance) {
      logger.error('ExtPay not initialized');
      return;
    }
    
    await instance.openPaymentPage();
    logger.log('Payment page opened');
  } catch (error) {
    logger.error('Failed to open payment page:', error);
    // Fallback to ExtensionPay website
    window.open('https://extensionpay.com', '_blank');
  }
}

/**
 * Open the customer portal for managing subscription
 * This allows users to update payment methods, cancel subscription, etc.
 * 
 * @param extpay - ExtPay instance from popup context
 */
export async function openCustomerPortal(extpay?: any): Promise<void> {
  try {
    const instance = extpay || extpayInstance;
    if (!instance) {
      logger.error('ExtPay not initialized');
      return;
    }
    
    await instance.openLoginPage();
    logger.log('Customer portal opened');
  } catch (error) {
    logger.error('Failed to open customer portal:', error);
  }
}

/**
 * Get detailed user subscription information
 * 
 * @returns User subscription details or null if not available
 */
export async function getSubscriptionDetails(): Promise<{
  isPremium: boolean;
  email?: string;
  planName: string;
  trialDaysRemaining?: number;
  subscriptionStatus?: string;
  nextBillingDate?: Date;
} | null> {
  try {
    if (!extpayInstance) {
      return {
        isPremium: false,
        planName: 'Free'
      };
    }

    const user = await extpayInstance.getUser();
    const isPremium = user.paid === true;
    
    // Calculate trial days remaining if in trial
    let trialDaysRemaining = undefined;
    if (user.trialStartedAt && !user.paid) {
      const trialStart = new Date(user.trialStartedAt);
      const now = new Date();
      const daysSinceTrialStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      const trialPeriod = 7; // 7-day trial period
      trialDaysRemaining = Math.max(0, trialPeriod - daysSinceTrialStart);
    }
    
    return {
      isPremium,
      email: user.email,
      planName: isPremium ? 'Premium' : (trialDaysRemaining !== undefined ? 'Free Trial' : 'Free'),
      trialDaysRemaining,
      subscriptionStatus: user.subscriptionStatus,
      nextBillingDate: user.paidThroughDate ? new Date(user.paidThroughDate) : undefined
    };
  } catch (error) {
    logger.error('Error getting subscription details:', error);
    return null;
  }
}

/**
 * Listen for payment events
 * This sets up listeners for when users complete payment or subscription changes
 * 
 * @param onPaid - Callback when user completes payment
 * @param onTrialStarted - Callback when user starts trial
 */
export function setupPaymentListeners(
  onPaid?: () => void,
  onTrialStarted?: () => void
): void {
  if (!extpayInstance) {
    logger.warn('Cannot setup payment listeners - ExtPay not initialized');
    return;
  }
  
  // Listen for successful payment
  if (onPaid) {
    extpayInstance.onPaid.addListener(() => {
      logger.log('User completed payment!');
      onPaid();
    });
  }
  
  // Listen for trial start
  if (onTrialStarted) {
    extpayInstance.onTrialStarted?.addListener(() => {
      logger.log('User started trial!');
      onTrialStarted();
    });
  }
}

/**
 * Get a formatted display string for the subscription status
 * Useful for showing in the UI
 * 
 * @returns A user-friendly subscription status string
 */
export async function getSubscriptionDisplayStatus(): Promise<string> {
  const details = await getSubscriptionDetails();
  
  if (!details) {
    return 'Free Plan';
  }
  
  if (details.isPremium) {
    if (details.nextBillingDate) {
      const formatter = new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `Premium (renews ${formatter.format(details.nextBillingDate)})`;
    }
    return 'Premium';
  }
  
  if (details.trialDaysRemaining !== undefined && details.trialDaysRemaining > 0) {
    return `Free Trial (${details.trialDaysRemaining} days left)`;
  }
  
  return 'Free Plan';
}

/**
 * Check if user is in trial period
 * 
 * @returns True if user is currently in trial period
 */
export async function isInTrial(): Promise<boolean> {
  try {
    if (!extpayInstance) {
      return false;
    }
    
    const user = await extpayInstance.getUser();
    return user.trialStartedAt && !user.paid;
  } catch (error) {
    logger.error('Error checking trial status:', error);
    return false;
  }
}

/**
 * Start a free trial for the user
 * This can be called to programmatically start a trial
 */
export async function startFreeTrial(extpay?: any): Promise<boolean> {
  try {
    const instance = extpay || extpayInstance;
    if (!instance) {
      logger.error('ExtPay not initialized');
      return false;
    }
    
    // ExtPay handles trial logic internally
    // Opening payment page with trial configured will start trial
    await instance.openTrialPage?.();
    return true;
  } catch (error) {
    logger.error('Failed to start trial:', error);
    return false;
  }
}