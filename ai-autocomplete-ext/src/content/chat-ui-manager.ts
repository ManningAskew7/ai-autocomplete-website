import { logger } from './content-logger';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatUISettings {
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  backgroundImage?: string; // base64
  opacity?: number; // 0.5 to 1
}

interface DomainPermissions {
  [domain: string]: {
    allowed: boolean;
    timestamp: number;
    alwaysAllow?: boolean;
  };
}

interface WebpageContext {
  url: string;
  title: string;
  domain: string;
  mainContent: string;
  headings: string[];
  selectedText?: string;
  characterCount: number;
  estimatedTokens: number;
}

export class ChatUIManager {
  private chatContainer: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private inputField: HTMLInputElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private isOpen: boolean = false;
  private isLoading: boolean = false;
  private currentConversation: ChatMessage[] = [];
  private maxContextMessages: number = 20; // Maximum messages to keep in context
  private chatMode: 'global' | 'domain' = 'global'; // Default to global mode
  private modeToggleButton: HTMLButtonElement | null = null;
  
  // Customization properties
  private settingsPanel: HTMLElement | null = null;
  private settingsOpen: boolean = false;
  private isDragging: boolean = false;
  private isResizing: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private uiSettings: ChatUISettings = {
    position: undefined,
    dimensions: undefined,
    backgroundImage: undefined,
    opacity: 0.95
  };
  
  // Context extraction properties
  private domainPermissions: DomainPermissions = {};
  private contextIncluded: boolean = false;
  private pageContext: WebpageContext | null = null;

  constructor() {
    logger.log('ChatUIManager initialized');
    this.initializeConversation();
    this.loadUISettings();
    this.loadDomainPermissions();
  }

  private async loadUISettings(): Promise<void> {
    chrome.storage.local.get(['chatUISettings'], (result) => {
      if (result.chatUISettings) {
        this.uiSettings = { ...this.uiSettings, ...result.chatUISettings };
        logger.log('UI settings loaded:', this.uiSettings);
      }
    });
  }

  private async loadDomainPermissions(): Promise<void> {
    chrome.storage.local.get(['domainPermissions'], (result) => {
      if (result.domainPermissions) {
        this.domainPermissions = result.domainPermissions;
        logger.log('Domain permissions loaded');
      }
    });
  }

  private async saveDomainPermissions(): Promise<void> {
    chrome.storage.local.set({ domainPermissions: this.domainPermissions }, () => {
      logger.log('Domain permissions saved');
    });
  }

  private async saveUISettings(): Promise<void> {
    chrome.storage.local.set({ chatUISettings: this.uiSettings }, () => {
      logger.log('UI settings saved');
    });
  }

  private initializeConversation(): void {
    // Load saved mode preference
    chrome.storage.sync.get(['chatMode'], (result) => {
      if (result.chatMode) {
        this.chatMode = result.chatMode;
        logger.log(`Chat mode loaded: ${this.chatMode}`);
      }
      this.loadConversationHistory();
    });
  }

  private getStorageKey(): string {
    if (this.chatMode === 'global') {
      return 'chat_history_global';
    }
    const domain = window.location.hostname || 'localhost';
    return `chat_history_${domain}`;
  }

  private async toggleChatMode(): Promise<void> {
    // Save current conversation before switching
    this.saveConversationHistory();
    
    // Toggle mode
    const newMode = this.chatMode === 'global' ? 'domain' : 'global';
    
    // Check permissions if switching to domain mode
    if (newMode === 'domain') {
      const hasPermission = await this.checkDomainPermission();
      if (!hasPermission) {
        logger.log('Domain mode permission denied');
        return; // Don't switch if permission denied
      }
    }
    
    this.chatMode = newMode;
    
    // Save mode preference
    chrome.storage.sync.set({ chatMode: newMode });
    
    // Clear current conversation from UI
    this.currentConversation = [];
    this.contextIncluded = false; // Reset context flag
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
    
    // Load conversation for new mode
    this.loadConversationHistory();
    
    // Update UI
    this.updateModeIndicators();
    
    // Show notification
    this.showModeNotification(newMode);
    
    logger.log(`Switched to ${newMode} mode`);
  }

  private updateModeIndicators(): void {
    // Update title
    const titleElement = document.getElementById('chat-title');
    if (titleElement) {
      titleElement.textContent = this.chatMode === 'global' 
        ? 'AI Chat (Global)' 
        : `AI Chat (${window.location.hostname})`;
    }
    
    // Update mode toggle button
    if (this.modeToggleButton) {
      this.modeToggleButton.innerHTML = this.chatMode === 'global' ? '🌐' : '📍';
      this.modeToggleButton.title = this.chatMode === 'global' 
        ? 'Global Mode - Chat follows across all sites' 
        : `Domain Mode - Chat specific to ${window.location.hostname}`;
      this.modeToggleButton.style.color = this.chatMode === 'global' ? '#4a9eff' : '#ff9a4a';
    }
    
    // Update message count
    this.updateMessageCount();
  }

  private showModeNotification(mode: 'global' | 'domain'): void {
    if (!this.messagesContainer) return;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: #4a9eff;
      color: white;
      padding: 8px 12px;
      margin: 8px;
      border-radius: 4px;
      font-size: 13px;
      text-align: center;
      animation: ai-autocomplete-fadeIn 0.3s ease-out;
    `;
    
    const modeText = mode === 'global' 
      ? '🌐 Switched to Global Mode - Chat follows you across all sites'
      : `📍 Switched to Domain Mode - Chat specific to ${window.location.hostname}`;
    
    notification.textContent = modeText;
    this.messagesContainer.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Add welcome message if no history
    if (this.currentConversation.length === 0) {
      setTimeout(() => {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.style.cssText = `
          background: #2a2a2a;
          color: #aaa;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
        `;
        welcomeMessage.textContent = 'Ask me anything! I\'m here to help.';
        this.messagesContainer?.appendChild(welcomeMessage);
      }, 100);
    }
  }

  private async loadConversationHistory(): Promise<void> {
    try {
      const storageKey = this.getStorageKey();
      
      chrome.storage.local.get([storageKey], (result) => {
        if (result[storageKey] && Array.isArray(result[storageKey])) {
          this.currentConversation = result[storageKey];
          logger.log(`Loaded ${this.currentConversation.length} messages from ${this.chatMode} history`);
          
          // Restore messages to UI if chat is already open
          if (this.isOpen && this.messagesContainer) {
            this.restoreConversationToUI();
          }
        }
      });
    } catch (error) {
      logger.error('Error loading conversation history:', error);
    }
  }

  private async saveConversationHistory(): Promise<void> {
    try {
      const storageKey = this.getStorageKey();
      
      // Keep only the most recent messages to avoid storage limits
      const messagesToSave = this.currentConversation.slice(-50);
      
      chrome.storage.local.set({ [storageKey]: messagesToSave }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Error saving conversation:', chrome.runtime.lastError);
        } else {
          logger.log(`Conversation saved to ${this.chatMode} storage`);
        }
      });
    } catch (error) {
      logger.error('Error saving conversation history:', error);
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public open(): void {
    if (this.isOpen) return;
    
    this.createChatUI();
    this.isOpen = true;
    logger.log('Chat UI opened');
    
    // Restore conversation history to UI if exists
    if (this.currentConversation.length > 0) {
      this.restoreConversationToUI();
    }
    
    // Focus the input field after opening
    setTimeout(() => {
      this.inputField?.focus();
    }, 100);
  }

  private restoreConversationToUI(): void {
    if (!this.messagesContainer) return;
    
    // Clear welcome message
    this.messagesContainer.innerHTML = '';
    
    // Add all messages from history
    this.currentConversation.forEach(message => {
      this.addMessageToUI(message, false); // false = don't save, we're just restoring
    });
    
    this.scrollToBottom();
  }

  public close(): void {
    if (!this.isOpen) return;
    
    if (this.chatContainer) {
      this.chatContainer.remove();
      this.chatContainer = null;
      this.messagesContainer = null;
      this.inputField = null;
      this.sendButton = null;
    }
    
    this.isOpen = false;
    logger.log('Chat UI closed');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public displayResponse(response: string): void {
    if (!this.messagesContainer) return;
    
    // Add assistant message to conversation
    const assistantMessage: ChatMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };
    
    this.currentConversation.push(assistantMessage);
    this.addMessageToUI(assistantMessage);
    this.saveConversationHistory(); // Save after adding response
    this.setLoading(false);
  }

  public clearConversation(): void {
    this.currentConversation = [];
    
    // Clear storage for current mode
    const storageKey = this.getStorageKey();
    chrome.storage.local.remove([storageKey]);
    
    // Clear UI
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
      
      // Add welcome message back
      const welcomeMessage = document.createElement('div');
      welcomeMessage.style.cssText = `
        background: #2a2a2a;
        color: #aaa;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        text-align: center;
      `;
      welcomeMessage.textContent = 'Ask me anything! I\'m here to help.';
      this.messagesContainer.appendChild(welcomeMessage);
    }
    
    logger.log('Conversation cleared');
  }

  public displayError(error: string): void {
    if (!this.messagesContainer) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-autocomplete-chat-error';
    errorDiv.textContent = `Error: ${error}`;
    errorDiv.style.cssText = `
      background: #ff4444;
      color: white;
      padding: 8px 12px;
      margin: 8px;
      border-radius: 4px;
      font-size: 13px;
    `;
    
    this.messagesContainer.appendChild(errorDiv);
    this.scrollToBottom();
    this.setLoading(false);
  }

  private createChatUI(): void {
    // Remove existing container if any
    if (this.chatContainer) {
      this.chatContainer.remove();
    }

    // Create main container
    this.chatContainer = document.createElement('div');
    this.chatContainer.className = 'ai-autocomplete-chat';
    
    // Apply saved or default dimensions
    const width = this.uiSettings.dimensions?.width || 400;
    const height = this.uiSettings.dimensions?.height || 500;
    
    // Apply saved or default position
    let positionStyles = '';
    if (this.uiSettings.position) {
      positionStyles = `
        left: ${this.uiSettings.position.x}px;
        top: ${this.uiSettings.position.y}px;
      `;
    } else {
      positionStyles = `
        bottom: 20px;
        right: 20px;
      `;
    }
    
    // Apply background and opacity
    const bgImage = this.uiSettings.backgroundImage 
      ? `background-image: url(${this.uiSettings.backgroundImage}); background-size: cover; background-position: center;`
      : '';
    const opacity = this.uiSettings.opacity || 0.95;
    
    this.chatContainer.style.cssText = `
      position: fixed;
      ${positionStyles}
      width: ${width}px;
      height: ${height}px;
      background: #1a1a1a;
      ${bgImage}
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      animation: ai-autocomplete-slideUp 0.3s ease-out;
      opacity: ${opacity};
      resize: both;
      overflow: auto;
      min-width: 300px;
      min-height: 400px;
      max-width: 800px;
      max-height: 800px;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ai-autocomplete-slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .ai-autocomplete-chat-message {
        animation: ai-autocomplete-fadeIn 0.3s ease-out;
      }
      
      @keyframes ai-autocomplete-fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .ai-autocomplete-chat-input:focus {
        outline: none;
        border-color: #4a9eff !important;
      }
      
      .ai-autocomplete-chat-send:hover:not(:disabled) {
        background: #5aafff !important;
      }
      
      .ai-autocomplete-chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .ai-autocomplete-chat-messages::-webkit-scrollbar {
        width: 8px;
      }
      
      .ai-autocomplete-chat-messages::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 4px;
      }
      
      .ai-autocomplete-chat-messages::-webkit-scrollbar-thumb {
        background: #4a4a4a;
        border-radius: 4px;
      }
      
      .ai-autocomplete-chat-messages::-webkit-scrollbar-thumb:hover {
        background: #5a5a5a;
      }
    `;
    document.head.appendChild(style);

    // Create header (draggable)
    const header = document.createElement('div');
    header.className = 'ai-autocomplete-chat-header';
    header.style.cssText = `
      padding: 12px 16px;
      background: rgba(42, 42, 42, 0.95);
      border-bottom: 1px solid #3a3a3a;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    `;
    
    // Make header draggable
    this.setupDraggable(header);

    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    const title = document.createElement('div');
    title.id = 'chat-title';
    title.textContent = this.chatMode === 'global' 
      ? 'AI Chat (Global)' 
      : `AI Chat (${window.location.hostname})`;
    title.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
    `;

    // Add settings info
    const settingsInfo = document.createElement('div');
    settingsInfo.id = 'chat-settings-info';
    settingsInfo.style.cssText = `
      color: #888;
      font-size: 11px;
    `;
    
    // Load and display settings
    chrome.storage.sync.get(['modelSettings', 'customSystemPrompt'], (result) => {
      const maxTokens = result.modelSettings?.maxTokens || 500;
      const hasCustomPrompt = result.customSystemPrompt && result.customSystemPrompt.trim();
      
      let infoText = `${this.chatMode === 'global' ? '🌐' : '📍'} ${this.chatMode} • Max tokens: ${maxTokens}`;
      if (hasCustomPrompt) {
        infoText += ' • Custom prompt active';
      }
      if (this.currentConversation.length > 0) {
        infoText += ` • ${this.currentConversation.length} messages`;
      }
      settingsInfo.textContent = infoText;
    });
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(settingsInfo);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    // Add Settings button
    const settingsButton = document.createElement('button');
    settingsButton.innerHTML = '⚙️';
    settingsButton.title = 'Chat Settings';
    settingsButton.style.cssText = `
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    settingsButton.onmouseover = () => {
      settingsButton.style.background = '#3a3a3a';
      settingsButton.style.color = '#4a9eff';
      settingsButton.style.transform = 'rotate(90deg)';
    };
    settingsButton.onmouseout = () => {
      settingsButton.style.background = 'none';
      settingsButton.style.color = '#888';
      settingsButton.style.transform = 'rotate(0deg)';
    };
    settingsButton.onclick = () => {
      this.toggleSettings();
    };
    
    // Add Mode Toggle button
    this.modeToggleButton = document.createElement('button');
    this.modeToggleButton.innerHTML = this.chatMode === 'global' ? '🌐' : '📍';
    this.modeToggleButton.title = this.chatMode === 'global' 
      ? 'Global Mode - Chat follows across all sites' 
      : `Domain Mode - Chat specific to ${window.location.hostname}`;
    this.modeToggleButton.style.cssText = `
      background: none;
      border: 1px solid #3a3a3a;
      color: ${this.chatMode === 'global' ? '#4a9eff' : '#ff9a4a'};
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    this.modeToggleButton.onmouseover = () => {
      if (this.modeToggleButton) {
        this.modeToggleButton.style.background = '#3a3a3a';
        this.modeToggleButton.style.transform = 'scale(1.1)';
      }
    };
    this.modeToggleButton.onmouseout = () => {
      if (this.modeToggleButton) {
        this.modeToggleButton.style.background = 'none';
        this.modeToggleButton.style.transform = 'scale(1)';
      }
    };
    this.modeToggleButton.onclick = () => {
      this.toggleChatMode();
    };

    // Add New Chat button
    const newChatButton = document.createElement('button');
    newChatButton.innerHTML = '🔄';
    newChatButton.title = 'New Chat';
    newChatButton.style.cssText = `
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    newChatButton.onmouseover = () => {
      newChatButton.style.background = '#3a3a3a';
      newChatButton.style.color = '#4a9eff';
    };
    newChatButton.onmouseout = () => {
      newChatButton.style.background = 'none';
      newChatButton.style.color = '#888';
    };
    newChatButton.onclick = () => {
      if (this.currentConversation.length > 0 && confirm('Clear conversation history?')) {
        this.clearConversation();
      }
    };

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: #888;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#3a3a3a';
      closeButton.style.color = '#fff';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = 'none';
      closeButton.style.color = '#888';
    };
    closeButton.onclick = () => this.close();

    buttonContainer.appendChild(settingsButton);
    buttonContainer.appendChild(this.modeToggleButton);
    buttonContainer.appendChild(newChatButton);
    buttonContainer.appendChild(closeButton);

    header.appendChild(titleContainer);
    header.appendChild(buttonContainer);
    
    // Create settings panel (hidden by default)
    this.settingsPanel = this.createSettingsPanel();
    this.settingsPanel.style.display = 'none';

    // Create messages container
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'ai-autocomplete-chat-messages';
    this.messagesContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Add welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.style.cssText = `
      background: #2a2a2a;
      color: #aaa;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    `;
    welcomeMessage.textContent = 'Ask me anything! I\'m here to help.';
    this.messagesContainer.appendChild(welcomeMessage);

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      padding: 12px;
      border-top: 1px solid #3a3a3a;
      display: flex;
      gap: 8px;
    `;

    // Create input field
    this.inputField = document.createElement('input');
    this.inputField.className = 'ai-autocomplete-chat-input';
    this.inputField.type = 'text';
    this.inputField.placeholder = 'Type your message...';
    this.inputField.style.cssText = `
      flex: 1;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    `;

    // Create send button
    this.sendButton = document.createElement('button');
    this.sendButton.className = 'ai-autocomplete-chat-send';
    this.sendButton.textContent = 'Send';
    this.sendButton.style.cssText = `
      background: #4a9eff;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    `;

    // Add event listeners
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // Assemble input container
    inputContainer.appendChild(this.inputField);
    inputContainer.appendChild(this.sendButton);

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'ai-autocomplete-resize-handle';
    resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      z-index: 10;
    `;
    resizeHandle.innerHTML = `
      <svg width="20" height="20" style="position: absolute; bottom: 2px; right: 2px; opacity: 0.3;">
        <path d="M 18,18 L 18,10 M 18,18 L 10,18" stroke="#888" stroke-width="2" fill="none"/>
        <path d="M 18,18 L 18,6 M 18,18 L 6,18" stroke="#888" stroke-width="1" fill="none"/>
      </svg>
    `;
    this.setupResizable(resizeHandle);
    
    // Assemble main container
    this.chatContainer.appendChild(header);
    this.chatContainer.appendChild(this.settingsPanel);
    this.chatContainer.appendChild(this.messagesContainer);
    this.chatContainer.appendChild(inputContainer);
    this.chatContainer.appendChild(resizeHandle);

    // Add to page
    document.body.appendChild(this.chatContainer);
  }

  private async sendMessage(): Promise<void> {
    if (!this.inputField || !this.inputField.value.trim() || this.isLoading) return;

    const message = this.inputField.value.trim();
    this.inputField.value = '';

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.currentConversation.push(userMessage);
    this.addMessageToUI(userMessage);
    this.saveConversationHistory(); // Save after adding user message
    
    // Update message count in header
    this.updateMessageCount();
    
    // Set loading state
    this.setLoading(true);

    // Check if we should include page context (first message in domain mode)
    if (this.chatMode === 'domain' && !this.contextIncluded && this.currentConversation.length === 1) {
      logger.log('Extracting page context for domain mode...');
      // Extract and store page context
      this.pageContext = this.extractPageContext();
      this.contextIncluded = true;
      
      logger.log(`Page context extracted: ${this.pageContext.domain}, ${this.pageContext.characterCount} chars`);
      
      // Show context indicator
      this.showContextIndicator();
    }
    
    // Send message to background script with conversation history
    this.sendToBackground(message);
  }

  private updateMessageCount(): void {
    const settingsInfo = document.getElementById('chat-settings-info');
    if (settingsInfo) {
      chrome.storage.sync.get(['modelSettings', 'customSystemPrompt'], (result) => {
        const maxTokens = result.modelSettings?.maxTokens || 500;
        const hasCustomPrompt = result.customSystemPrompt && result.customSystemPrompt.trim();
        
        let infoText = `${this.chatMode === 'global' ? '🌐' : '📍'} ${this.chatMode} • Max tokens: ${maxTokens}`;
        if (hasCustomPrompt) {
          infoText += ' • Custom prompt active';
        }
        if (this.currentConversation.length > 0) {
          infoText += ` • ${this.currentConversation.length} messages`;
        }
        settingsInfo.textContent = infoText;
      });
    }
  }

  private addMessageToUI(message: ChatMessage, _shouldSave: boolean = true): void {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-autocomplete-chat-message';
    messageDiv.setAttribute('data-message-id', message.id);
    messageDiv.style.cssText = `
      display: flex;
      ${message.role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      ${message.role === 'user' 
        ? 'background: #4a9eff; color: white; border-bottom-right-radius: 4px;' 
        : 'background: #2a2a2a; color: #e0e0e0; border-bottom-left-radius: 4px;'}
    `;
    
    // Handle multiline text
    bubble.innerText = message.content;
    bubble.style.whiteSpace = 'pre-wrap';
    
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);
    
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    
    if (this.sendButton) {
      this.sendButton.disabled = loading;
      this.sendButton.textContent = loading ? '...' : 'Send';
    }
    
    if (this.inputField) {
      this.inputField.disabled = loading;
    }

    if (loading && this.messagesContainer) {
      // Add loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'ai-autocomplete-chat-loading';
      loadingDiv.style.cssText = `
        display: flex;
        justify-content: flex-start;
        margin: 8px 0;
      `;
      
      const loadingBubble = document.createElement('div');
      loadingBubble.style.cssText = `
        background: #2a2a2a;
        padding: 10px 14px;
        border-radius: 12px;
        border-bottom-left-radius: 4px;
      `;
      
      loadingBubble.innerHTML = `
        <div style="display: flex; gap: 4px;">
          <div style="width: 8px; height: 8px; background: #4a9eff; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></div>
          <div style="width: 8px; height: 8px; background: #4a9eff; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></div>
          <div style="width: 8px; height: 8px; background: #4a9eff; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></div>
        </div>
      `;
      
      // Add bounce animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `;
      if (!document.head.querySelector('style[data-chat-loading]')) {
        style.setAttribute('data-chat-loading', 'true');
        document.head.appendChild(style);
      }
      
      loadingDiv.appendChild(loadingBubble);
      this.messagesContainer.appendChild(loadingDiv);
      this.scrollToBottom();
    } else if (!loading && this.messagesContainer) {
      // Remove loading indicator
      const loadingDiv = this.messagesContainer.querySelector('.ai-autocomplete-chat-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }
  }

  private showContextIndicator(): void {
    if (!this.messagesContainer || !this.pageContext) return;
    
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      background: rgba(74, 158, 255, 0.1);
      border: 1px solid #4a9eff;
      color: #4a9eff;
      padding: 8px 12px;
      margin: 8px;
      border-radius: 6px;
      font-size: 12px;
      text-align: center;
      animation: ai-autocomplete-fadeIn 0.3s ease-out;
    `;
    
    indicator.innerHTML = `
      📄 Page context included 
      <span style="opacity: 0.7;">
        (~${this.pageContext.estimatedTokens.toLocaleString()} tokens)
      </span>
    `;
    
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }

  private async sendToBackground(message: string): Promise<void> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        throw new Error('Extension context lost. Please refresh the page.');
      }

      // Prepare conversation history for context
      // Limit to recent messages to avoid token limits
      const contextMessages = this.getContextMessages();

      // Send page context separately to be added as system prompt
      let pageContextToSend = null;
      if (this.chatMode === 'domain' && this.pageContext && this.contextIncluded) {
        pageContextToSend = this.pageContext;
        logger.log('Sending page context with message (will be added to system prompt)');
      }
      
      // Send message to background script with conversation history and page context
      chrome.runtime.sendMessage({
        type: 'GET_CHAT_RESPONSE',
        message: message,
        conversationHistory: contextMessages,
        pageContext: pageContextToSend
      }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error('Error sending chat message:', chrome.runtime.lastError);
          this.displayError('Failed to send message. Please try again.');
          return;
        }

        if (response?.error) {
          this.displayError(response.error);
        } else if (response?.response) {
          this.displayResponse(response.response);
        } else {
          this.displayError('No response received');
        }
      });
    } catch (error) {
      logger.error('Error in sendToBackground:', error);
      this.displayError('Failed to send message. Please refresh the page.');
    }
  }

  private setupDraggable(header: HTMLElement): void {
    header.addEventListener('mousedown', (e) => {
      if (e.target === header || (e.target as HTMLElement).closest('.ai-autocomplete-chat-header')) {
        // Don't start drag if clicking on buttons
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        
        this.isDragging = true;
        const rect = this.chatContainer!.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        // Prevent text selection while dragging
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.chatContainer) {
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        
        // Boundary detection
        const maxX = window.innerWidth - this.chatContainer.offsetWidth;
        const maxY = window.innerHeight - this.chatContainer.offsetHeight;
        
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        this.chatContainer.style.left = `${boundedX}px`;
        this.chatContainer.style.top = `${boundedY}px`;
        this.chatContainer.style.bottom = 'auto';
        this.chatContainer.style.right = 'auto';
        
        // Save position
        this.uiSettings.position = { x: boundedX, y: boundedY };
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.saveUISettings();
      }
    });
  }

  private setupResizable(handle: HTMLElement): void {
    handle.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      e.preventDefault();
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = this.chatContainer!.offsetWidth;
      const startHeight = this.chatContainer!.offsetHeight;
      
      const handleResize = (e: MouseEvent) => {
        if (!this.isResizing || !this.chatContainer) return;
        
        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);
        
        // Enforce constraints
        const constrainedWidth = Math.max(300, Math.min(800, newWidth));
        const constrainedHeight = Math.max(400, Math.min(800, newHeight));
        
        this.chatContainer.style.width = `${constrainedWidth}px`;
        this.chatContainer.style.height = `${constrainedHeight}px`;
        
        // Save dimensions
        this.uiSettings.dimensions = { 
          width: constrainedWidth, 
          height: constrainedHeight 
        };
      };
      
      const stopResize = () => {
        if (this.isResizing) {
          this.isResizing = false;
          this.saveUISettings();
        }
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };
      
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
    });
  }

  private createSettingsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ai-autocomplete-settings-panel';
    panel.style.cssText = `
      padding: 12px;
      background: rgba(42, 42, 42, 0.98);
      border-bottom: 1px solid #3a3a3a;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    `;
    
    // Background image section
    const bgSection = document.createElement('div');
    bgSection.innerHTML = `
      <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">Background Image:</div>
      <div style="display: flex; gap: 8px;">
        <input type="file" accept="image/*" id="bg-upload" style="display: none;">
        <button id="upload-btn" style="
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          color: #ddd;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Upload Image</button>
        <button id="clear-bg-btn" style="
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          color: #ddd;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Clear</button>
      </div>
    `;
    
    // Opacity slider section
    const opacitySection = document.createElement('div');
    opacitySection.innerHTML = `
      <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">
        Opacity: <span id="opacity-value">${Math.round((this.uiSettings.opacity || 0.95) * 100)}%</span>
      </div>
      <input type="range" id="opacity-slider" min="50" max="100" value="${Math.round((this.uiSettings.opacity || 0.95) * 100)}" style="
        width: 100%;
        cursor: pointer;
      ">
    `;
    
    // Reset buttons section
    const resetSection = document.createElement('div');
    resetSection.innerHTML = `
      <div style="display: flex; gap: 8px;">
        <button id="reset-position-btn" style="
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          color: #ddd;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
        ">Reset Position</button>
        <button id="reset-size-btn" style="
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          color: #ddd;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
        ">Reset Size</button>
      </div>
    `;
    
    panel.appendChild(bgSection);
    panel.appendChild(opacitySection);
    panel.appendChild(resetSection);
    
    // Set up event handlers after a delay to ensure elements are in DOM
    setTimeout(() => this.setupSettingsHandlers(panel), 100);
    
    return panel;
  }

  private setupSettingsHandlers(panel: HTMLElement): void {
    // Background upload
    const fileInput = panel.querySelector('#bg-upload') as HTMLInputElement;
    const uploadBtn = panel.querySelector('#upload-btn') as HTMLButtonElement;
    const clearBtn = panel.querySelector('#clear-bg-btn') as HTMLButtonElement;
    
    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();
      
      fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            this.uiSettings.backgroundImage = base64;
            if (this.chatContainer) {
              this.chatContainer.style.backgroundImage = `url(${base64})`;
              this.chatContainer.style.backgroundSize = 'cover';
              this.chatContainer.style.backgroundPosition = 'center';
            }
            this.saveUISettings();
          };
          reader.readAsDataURL(file);
        }
      };
    }
    
    if (clearBtn) {
      clearBtn.onclick = () => {
        this.uiSettings.backgroundImage = undefined;
        if (this.chatContainer) {
          this.chatContainer.style.backgroundImage = '';
        }
        this.saveUISettings();
      };
    }
    
    // Opacity slider
    const opacitySlider = panel.querySelector('#opacity-slider') as HTMLInputElement;
    const opacityValue = panel.querySelector('#opacity-value') as HTMLSpanElement;
    
    if (opacitySlider) {
      opacitySlider.oninput = () => {
        const value = parseInt(opacitySlider.value) / 100;
        this.uiSettings.opacity = value;
        if (this.chatContainer) {
          this.chatContainer.style.opacity = value.toString();
        }
        if (opacityValue) {
          opacityValue.textContent = `${opacitySlider.value}%`;
        }
        this.saveUISettings();
      };
    }
    
    // Reset buttons
    const resetPosBtn = panel.querySelector('#reset-position-btn') as HTMLButtonElement;
    const resetSizeBtn = panel.querySelector('#reset-size-btn') as HTMLButtonElement;
    
    if (resetPosBtn) {
      resetPosBtn.onclick = () => {
        this.uiSettings.position = undefined;
        if (this.chatContainer) {
          this.chatContainer.style.left = 'auto';
          this.chatContainer.style.top = 'auto';
          this.chatContainer.style.bottom = '20px';
          this.chatContainer.style.right = '20px';
        }
        this.saveUISettings();
      };
    }
    
    if (resetSizeBtn) {
      resetSizeBtn.onclick = () => {
        this.uiSettings.dimensions = undefined;
        if (this.chatContainer) {
          this.chatContainer.style.width = '400px';
          this.chatContainer.style.height = '500px';
        }
        this.saveUISettings();
      };
    }
  }

  private async checkDomainPermission(): Promise<boolean> {
    const domain = window.location.hostname;
    
    // Check if we already have permission for this domain
    if (this.domainPermissions[domain]?.alwaysAllow) {
      logger.log(`Domain ${domain} has permanent permission`);
      return true;
    }
    
    // Show permission dialog
    return new Promise((resolve) => {
      this.showPermissionDialog((allowed, alwaysAllow) => {
        // Save permission
        this.domainPermissions[domain] = {
          allowed,
          timestamp: Date.now(),
          alwaysAllow
        };
        
        if (alwaysAllow) {
          this.saveDomainPermissions();
        }
        
        resolve(allowed);
      });
    });
  }

  private showPermissionDialog(callback: (allowed: boolean, alwaysAllow: boolean) => void): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 2147483648;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    `;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      padding: 24px;
      max-width: 450px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      animation: slideUp 0.3s ease-out;
    `;
    
    dialog.innerHTML = `
      <h3 style="color: #fff; margin: 0 0 16px; font-size: 18px;">
        Enable Page Context for ${window.location.hostname}?
      </h3>
      <div style="color: #ff9a4a; background: rgba(255, 154, 74, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Warning</div>
        <div style="font-size: 14px; line-height: 1.4;">
          Page content will be sent to the AI. Only enable on sites without sensitive information like:
          <ul style="margin: 8px 0 0 20px;">
            <li>Banking or financial data</li>
            <li>Personal health information</li>
            <li>Private messages or emails</li>
            <li>Password or credit card forms</li>
          </ul>
        </div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="color: #aaa; font-size: 14px; display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="always-allow" style="margin-right: 8px; cursor: pointer;">
          Don't ask again for this site
        </label>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="deny-btn" style="
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          color: #ddd;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Deny</button>
        <button id="allow-btn" style="
          background: #4a9eff;
          border: none;
          color: white;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Allow This Time</button>
      </div>
    `;
    
    // Add event handlers
    const checkbox = dialog.querySelector('#always-allow') as HTMLInputElement;
    const denyBtn = dialog.querySelector('#deny-btn') as HTMLButtonElement;
    const allowBtn = dialog.querySelector('#allow-btn') as HTMLButtonElement;
    
    denyBtn.onclick = () => {
      overlay.remove();
      callback(false, false);
    };
    
    allowBtn.onclick = () => {
      overlay.remove();
      callback(true, checkbox.checked);
    };
    
    // Update button text when checkbox changes
    checkbox.onchange = () => {
      allowBtn.textContent = checkbox.checked ? 'Always Allow' : 'Allow This Time';
    };
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  private extractPageContext(): WebpageContext {
    const maxChars = 80000; // ~20,000 tokens
    
    // Extract main content
    const mainContent = this.extractMainContent(maxChars);
    
    // Extract headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 20) // Limit to 20 headings
      .map(h => h.textContent?.trim() || '')
      .filter(h => h.length > 0);
    
    // Get selected text if any
    const selectedText = window.getSelection()?.toString().trim();
    
    const context: WebpageContext = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      mainContent,
      headings,
      selectedText: selectedText?.length ? selectedText : undefined,
      characterCount: mainContent.length,
      estimatedTokens: Math.ceil(mainContent.length / 4)
    };
    
    logger.log(`Extracted page context: ${context.characterCount} chars, ~${context.estimatedTokens} tokens`);
    return context;
  }

  private extractMainContent(maxChars: number): string {
    let content = '';
    
    // Priority 1: Try to find main content areas
    const mainSelectors = ['main', 'article', '[role="main"]', '#content', '.content'];
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = this.getTextContent(element as HTMLElement);
        if (content.length > 100) break; // Found substantial content
      }
    }
    
    // Priority 2: Fall back to body if no main content found
    if (content.length < 100) {
      content = this.getTextContent(document.body);
    }
    
    // Clean and truncate
    content = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (content.length > maxChars) {
      content = content.substring(0, maxChars) + '\n[Content truncated at 80k characters]';
    }
    
    return content;
  }

  private getTextContent(element: HTMLElement): string {
    // Clone the element to avoid modifying the actual DOM
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove script and style elements
    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    
    // Remove hidden elements
    clone.querySelectorAll('[hidden], [aria-hidden="true"]').forEach(el => el.remove());
    
    // Get text content
    return clone.textContent || '';
  }

  private toggleSettings(): void {
    if (!this.settingsPanel) return;
    
    this.settingsOpen = !this.settingsOpen;
    
    if (this.settingsOpen) {
      this.settingsPanel.style.display = 'block';
      setTimeout(() => {
        this.settingsPanel!.style.maxHeight = '300px';
      }, 10);
    } else {
      this.settingsPanel.style.maxHeight = '0';
      setTimeout(() => {
        this.settingsPanel!.style.display = 'none';
      }, 300);
    }
  }

  private getContextMessages(): ChatMessage[] {
    // Get the last N messages for context, excluding the current message
    // We exclude the last message because it's the one we just added
    const messages = this.currentConversation.slice(-this.maxContextMessages - 1, -1);
    
    // Estimate token usage (rough approximation: 1 token ≈ 4 characters)
    let totalChars = 0;
    const maxChars = 40000; // Roughly 10k tokens for context
    const contextMessages: ChatMessage[] = [];
    
    // Start from most recent and work backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageChars = messages[i].content.length;
      if (totalChars + messageChars > maxChars) break;
      
      contextMessages.unshift(messages[i]);
      totalChars += messageChars;
    }
    
    logger.log(`Sending ${contextMessages.length} messages as context (${totalChars} chars)`);
    
    // Log message types for debugging
    contextMessages.forEach((msg, i) => {
      const preview = msg.content.substring(0, 50);
      logger.log(`  Context msg ${i + 1}: ${msg.role} - ${preview}...`);
    });
    
    return contextMessages;
  }
}