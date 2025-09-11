import { logger } from './content-logger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class ChatUIManager {
  private chatContainer: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private inputField: HTMLInputElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private isOpen: boolean = false;
  private isLoading: boolean = false;
  private currentConversation: ChatMessage[] = [];

  constructor() {
    logger.log('ChatUIManager initialized');
  }

  public open(): void {
    if (this.isOpen) return;
    
    this.createChatUI();
    this.isOpen = true;
    logger.log('Chat UI opened');
    
    // Focus the input field after opening
    setTimeout(() => {
      this.inputField?.focus();
    }, 100);
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
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };
    
    this.currentConversation.push(assistantMessage);
    this.addMessageToUI(assistantMessage);
    this.setLoading(false);
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
    this.chatContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 500px;
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      animation: ai-autocomplete-slideUp 0.3s ease-out;
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

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      background: #2a2a2a;
      border-bottom: 1px solid #3a3a3a;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    const title = document.createElement('div');
    title.textContent = 'AI Chat';
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
      
      let infoText = `Max tokens: ${maxTokens}`;
      if (hasCustomPrompt) {
        infoText += ' • Custom prompt active';
      }
      settingsInfo.textContent = infoText;
    });
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(settingsInfo);

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

    header.appendChild(titleContainer);
    header.appendChild(closeButton);

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

    // Assemble main container
    this.chatContainer.appendChild(header);
    this.chatContainer.appendChild(this.messagesContainer);
    this.chatContainer.appendChild(inputContainer);

    // Add to page
    document.body.appendChild(this.chatContainer);
  }

  private sendMessage(): void {
    if (!this.inputField || !this.inputField.value.trim() || this.isLoading) return;

    const message = this.inputField.value.trim();
    this.inputField.value = '';

    // Add user message to conversation
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.currentConversation.push(userMessage);
    this.addMessageToUI(userMessage);
    
    // Set loading state
    this.setLoading(true);

    // Send message to background script
    this.sendToBackground(message);
  }

  private addMessageToUI(message: ChatMessage): void {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-autocomplete-chat-message';
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

  private async sendToBackground(message: string): Promise<void> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        throw new Error('Extension context lost. Please refresh the page.');
      }

      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'GET_CHAT_RESPONSE',
        message: message,
        conversationHistory: [] // For now, we're not sending history
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
}