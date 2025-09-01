/**
 * Logger Utility for Development
 * 
 * This module provides conditional logging that only outputs in development mode.
 * In production, all logging is disabled to prevent information leakage and
 * improve performance.
 * 
 * Chrome Web Store requires minimal console output for security reasons.
 */

/**
 * Check if we're in development mode
 * In production builds, this should be false
 * 
 * For Chrome extensions, we check the manifest version or
 * can manually set this to false for production builds
 */
const isDevelopment = chrome.runtime.getManifest().version.includes('dev') ||
                      chrome.runtime.getManifest().name.includes('MVP') ||
                      true; // Set to true for debugging

/**
 * Logger class with conditional output
 */
class Logger {
  private enabled: boolean;
  private prefix: string;

  constructor(prefix: string = '[AI-Autocomplete]', enabled: boolean = isDevelopment) {
    this.prefix = prefix;
    this.enabled = enabled;
  }

  /**
   * Log general information
   */
  log(...args: any[]): void {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Log error messages (always enabled for critical errors)
   */
  error(...args: any[]): void {
    // Errors are always logged, even in production
    console.error(this.prefix, '[ERROR]', ...args);
  }

  /**
   * Log warning messages
   */
  warn(...args: any[]): void {
    if (this.enabled) {
      console.warn(this.prefix, '[WARN]', ...args);
    }
  }

  /**
   * Log debug information
   */
  debug(...args: any[]): void {
    if (this.enabled) {
      console.debug(this.prefix, '[DEBUG]', ...args);
    }
  }

  /**
   * Log info messages
   */
  info(...args: any[]): void {
    if (this.enabled) {
      console.info(this.prefix, '[INFO]', ...args);
    }
  }

  /**
   * Log grouped messages
   */
  group(label: string): void {
    if (this.enabled) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.enabled) {
      console.groupEnd();
    }
  }

  /**
   * Log table data
   */
  table(data: any): void {
    if (this.enabled) {
      console.table(data);
    }
  }

  /**
   * Log timing start
   */
  time(label: string): void {
    if (this.enabled) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  /**
   * Log timing end
   */
  timeEnd(label: string): void {
    if (this.enabled) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }

  /**
   * Create a child logger with a different prefix
   */
  createChild(childPrefix: string): Logger {
    return new Logger(`${this.prefix} [${childPrefix}]`, this.enabled);
  }

  /**
   * Enable or disable logging dynamically
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Create default logger instances for different modules
export const logger = new Logger();
export const backgroundLogger = new Logger('[Background]');
export const contentLogger = new Logger('[Content]');
export const popupLogger = new Logger('[Popup]');

// Export the Logger class for custom instances
export default Logger;