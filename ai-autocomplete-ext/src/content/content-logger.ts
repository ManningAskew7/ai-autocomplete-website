/**
 * Simplified Logger for Content Scripts
 * 
 * Content scripts cannot use ES6 modules, so this is a simplified
 * version that will be bundled directly into the content script.
 */

// Check if we're in development mode
const isDevelopment = true; // Set to true during development, false for production

/**
 * Simple logger for content scripts
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[Content]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors
    console.error('[Content] [ERROR]', ...args);
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[Content] [WARN]', ...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[Content] [DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[Content] [INFO]', ...args);
    }
  },
  
  group: (label: string) => {
    if (isDevelopment) {
      console.group(`[Content] ${label}`);
    }
  },
  
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
  
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};