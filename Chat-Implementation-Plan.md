# AI Autocomplete Chat Feature Implementation Plan

## Executive Summary

This document outlines the implementation plan for the chat interface feature in the AI Autocomplete Chrome Extension. The chat feature allows users to have conversations with AI models directly from any webpage via a keyboard shortcut (Alt+Shift+C), leveraging the existing OpenRouter API infrastructure.

## Current Status (Phase 1 Complete ✅)

### Completed Features
- **Chat UI Manager** (`src/content/chat-ui-manager.ts`): Full-featured chat interface with animations
- **Background Integration**: GET_CHAT_RESPONSE handler with proper token management
- **Keybind System**: Alt+Shift+C opens chat window
- **Settings Integration**: Chat keybind configuration in popup
- **Token Management**: Increased limits (100-62,000) for reasoning models
- **System Prompt Handling**: Optional system prompts for natural responses
- **Model Compatibility**: Works with 300+ models including GPT-5, Gemini 2.5 Pro
- **Visual Feedback**: Loading states, error messages, settings display

### Key Implementation Details
1. **ChatUIManager Class**: Handles all UI interactions and message flow
2. **Smart System Prompts**: Only uses custom prompts when explicitly set by user
3. **Token Display**: Shows current token limit and custom prompt status in chat header
4. **Reasoning Model Support**: Proper handling for models that require high token counts

## Architecture Overview

### Core Components
- **Background Script** (`src/background/index.ts`): API communication with OpenRouter
- **Content Script** (`src/content/index.ts`): Manages chat UI and keybinds
- **Chat UI Manager** (`src/content/chat-ui-manager.ts`): Chat window implementation
- **Popup UI** (`src/popup/Popup.tsx`): Settings and keybind configuration
- **Prompts System** (`src/background/prompts.ts`): Minimal chat prompts

### Message Flow
1. User presses Alt+Shift+C → Opens chat window
2. User types message → Sends to background script
3. Background script → Calls OpenRouter API with proper settings
4. API response → Displayed in chat window
5. Error handling → Shows user-friendly error messages

## Phase 2: Chat Memory (Next Implementation)

### Goal
Add conversation memory so the AI remembers context within a chat session

### Implementation Strategy

#### 1. Conversation History Management
```typescript
// In ChatUIManager
private currentConversation: ChatMessage[] = [];

private sendToBackground(message: string): void {
  chrome.runtime.sendMessage({
    type: 'GET_CHAT_RESPONSE',
    message: message,
    conversationHistory: this.currentConversation // Send full history
  });
}
```

#### 2. Background Script Updates
```typescript
// In background/index.ts
case 'GET_CHAT_RESPONSE':
  const messages = [];
  
  // Add system prompt if configured
  if (customPrompt) {
    messages.push({ role: "system", content: customPrompt });
  }
  
  // Add conversation history
  request.conversationHistory.forEach(msg => {
    messages.push({ 
      role: msg.role, 
      content: msg.content 
    });
  });
  
  // Add current message
  messages.push({ role: "user", content: request.message });
  
  // Send to API with full context
```

#### 3. Token Management for Context
- Implement sliding window for long conversations
- Track token usage per message
- Truncate oldest messages when approaching limit
- Show context indicator in UI (e.g., "Memory: Last 10 messages")

#### 4. Clear Conversation Feature
- Add "New Chat" button to header
- Keyboard shortcut (Ctrl+Shift+N in chat)
- Confirmation for clearing active conversation

### Testing Requirements
- [ ] Conversation context maintained across messages
- [ ] Token limits respected with history
- [ ] Clear conversation works properly
- [ ] Performance with long conversations
- [ ] Memory indicator shows accurately

## Phase 3: Separate Chats (Future Implementation)

### Goal
Support multiple independent conversations with tab/domain organization

### Implementation Strategy

#### 1. Chat Storage Architecture
```typescript
interface ChatStore {
  conversations: Map<string, Conversation>;
  activeConversationId: string;
}

interface Conversation {
  id: string;
  title: string;
  domain: string;
  messages: ChatMessage[];
  createdAt: number;
  lastUpdated: number;
}
```

#### 2. UI Enhancements
- **Chat Selector**: Dropdown or tabs for switching conversations
- **Auto-Title**: Generate conversation titles from first message
- **Domain Grouping**: Group chats by website domain
- **Search**: Find messages across all conversations

#### 3. Storage Implementation
```typescript
// Use chrome.storage.local for persistence
class ChatStorageManager {
  async saveConversation(id: string, conversation: Conversation) {
    const store = await this.getStore();
    store.conversations.set(id, conversation);
    await chrome.storage.local.set({ chatStore: store });
  }
  
  async loadConversations(): Promise<Conversation[]> {
    const result = await chrome.storage.local.get('chatStore');
    return Array.from(result.chatStore?.conversations.values() || []);
  }
}
```

#### 4. Conversation Management Features
- **New Conversation**: Start fresh chat while preserving others
- **Delete Conversation**: Remove with confirmation
- **Export Conversation**: Save as markdown or JSON
- **Pin Conversation**: Keep important chats easily accessible
- **Archive Old Chats**: Auto-archive after 30 days of inactivity

#### 5. Advanced Features
- **Cross-Tab Sync**: Share conversations across browser tabs
- **Conversation Templates**: Pre-configured chats for common tasks
- **Shared Conversations**: Export/import for team collaboration
- **Smart Suggestions**: Suggest relevant past conversations

### Database Schema
```typescript
// IndexedDB for better performance with large datasets
interface ChatDatabase {
  conversations: {
    key: string;
    value: Conversation;
    indexes: ['domain', 'lastUpdated', 'createdAt'];
  };
  messages: {
    key: string;
    value: ChatMessage & { conversationId: string };
    indexes: ['conversationId', 'timestamp'];
  };
}
```

### Performance Considerations
- Lazy load conversation history
- Virtual scrolling for message lists
- Pagination for conversation list
- Background indexing for search
- Compression for stored messages

## Technical Improvements Roadmap

### Immediate Enhancements
1. **Markdown Rendering**: Support for formatted responses
2. **Code Highlighting**: Syntax highlighting for code blocks
3. **Copy Button**: Easy copying of AI responses
4. **Resizable Window**: User-adjustable chat dimensions
5. **Keyboard Navigation**: Full keyboard support for accessibility

### Medium-term Goals
1. **Voice Input**: Web Speech API integration
2. **File Attachments**: Image/document context support
3. **Page Context**: Include selected text or page info
4. **Response Actions**: Quick actions on AI responses
5. **Custom Themes**: User-customizable chat appearance

### Long-term Vision
1. **Multi-modal Support**: Handle images, audio, video
2. **Workflow Automation**: Chain multiple AI actions
3. **Plugin System**: Extensible chat capabilities
4. **Team Features**: Shared knowledge base
5. **Analytics Dashboard**: Usage insights and optimization

## Testing Strategy

### Unit Testing
- ChatUIManager methods
- Message formatting functions
- Token counting utilities
- Storage operations

### Integration Testing
- Message flow end-to-end
- API error handling
- Storage persistence
- Cross-tab communication

### Performance Testing
- Load testing with 1000+ messages
- Memory usage monitoring
- Response time benchmarks
- Concurrent chat handling

### User Testing
- Usability studies with target users
- A/B testing for UI variations
- Feedback collection system
- Bug reporting integration

## Deployment Strategy

### Version Management
- Phase 2 (Memory): v0.3.0
- Phase 3 (Separate Chats): v0.4.0
- Production Ready: v1.0.0

### Release Process
1. Feature branch development
2. Internal testing (dev team)
3. Beta testing (selected users)
4. Staged rollout (10% → 50% → 100%)
5. Monitor metrics and feedback
6. Hot fixes as needed

### Success Metrics
- Chat usage rate > 30% of active users
- Average session length > 3 messages
- User satisfaction score > 4.5/5
- Response time < 2 seconds
- Error rate < 1%

## Conclusion

Phase 1 implementation is complete and functional. The chat feature successfully integrates with 300+ AI models through OpenRouter, providing users with a seamless chat experience directly in their browser. The architecture is robust and ready for Phase 2 (memory) and Phase 3 (separate chats) enhancements.

### Next Steps
1. **Immediate**: Begin Phase 2 implementation (conversation memory)
2. **Week 1-2**: Implement and test memory management
3. **Week 3-4**: Beta test Phase 2 with users
4. **Month 2**: Begin Phase 3 planning and development
5. **Month 3**: Full feature release with all phases

---

*Document Version: 2.0*  
*Last Updated: January 2025*  
*Status: Phase 1 Complete, Phase 2 Ready for Implementation*

## Detailed Implementation Plan - Phase 1

### 1. New Keybind Configuration

#### File: `src/content/index.ts`
Add to the `Keybinds` interface:
```typescript
interface Keybinds {
  // ... existing keybinds
  openChat?: string;  // Default: 'Alt+Shift+C'
}
```

#### File: `src/popup/Popup.tsx`
Add chat keybind to the keybinds tab UI with default value.

### 2. Chat UI Manager Class

#### File: `src/content/chat-ui-manager.ts` (NEW)
Create a new class following the existing pattern:

```typescript
class ChatUIManager {
  private chatContainer: HTMLElement | null = null;
  private isOpen: boolean = false;
  private currentConversation: Message[] = [];
  
  constructor() {
    // Initialize chat UI manager
  }
  
  public open(): void {
    // Create and display chat interface
  }
  
  public close(): void {
    // Clean up and hide chat interface
  }
  
  public toggle(): void {
    // Toggle chat visibility
  }
  
  private createChatUI(): HTMLElement {
    // Build the chat interface DOM structure
  }
  
  private sendMessage(message: string): void {
    // Handle sending messages to background script
  }
  
  private displayResponse(response: string): void {
    // Display AI response in chat
  }
}
```

### 3. Chat UI Design Specifications

#### Container Structure
```
┌─────────────────────────────────────┐
│  AI Chat                        [X] │
├─────────────────────────────────────┤
│                                     │
│  Messages Area                      │
│  (Scrollable)                       │
│                                     │
├─────────────────────────────────────┤
│  [Input Field]            [Send]    │
└─────────────────────────────────────┘
```

#### Styling Guidelines
- **Position**: Fixed, bottom-right corner (20px margin)
- **Dimensions**: 400px width × 500px height (responsive on mobile)
- **Colors**: Match existing dark theme (#1a1a1a background)
- **Animation**: Slide-up entrance (similar to rewrite UI)
- **Z-index**: 2147483647 (same as other overlays)

### 4. Background Script Message Handler

#### File: `src/background/index.ts`
Add new message type and handler:

```typescript
// Add to message handling switch
case 'GET_CHAT_RESPONSE':
  handleChatMessage(request, sendResponse);
  return true;

// New function
async function handleChatMessage(request: any, sendResponse: Function) {
  const { message, conversationHistory } = request;
  
  // Construct messages array for API
  const messages = [
    { role: "system", content: "You are a helpful AI assistant." },
    ...conversationHistory, // Future: Include previous messages
    { role: "user", content: message }
  ];
  
  // Use existing API call infrastructure
  // Similar to getCompletion but for chat
}
```

### 5. Message Protocol

#### Request Format
```typescript
interface ChatRequest {
  action: 'GET_CHAT_RESPONSE';
  message: string;
  conversationHistory?: Message[];  // For future memory implementation
}
```

#### Response Format
```typescript
interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}
```

### 6. Integration Points

#### Content Script Integration
In `src/content/index.ts`:

1. **Import ChatUIManager**
```typescript
import { ChatUIManager } from './chat-ui-manager';
const chatUI = new ChatUIManager();
```

2. **Add Keybind Handler**
```typescript
// In the main keydown event listener
if (keybindManager.matches(event, keybinds.openChat)) {
  event.preventDefault();
  chatUI.toggle();
  return;
}
```

3. **Message Handling**
```typescript
// Add chat message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHAT_RESPONSE') {
    chatUI.displayResponse(request.response);
  }
});
```

### 7. Chat-Specific Prompts

#### File: `src/background/prompts.ts`
Add chat-specific system prompt:

```typescript
export const CHAT_SYSTEM_PROMPT = `You are a helpful AI assistant integrated into a Chrome extension. 
You can help users with various tasks while they browse the web. 
Be concise but thorough in your responses. 
Remember you're appearing in a small chat window, so format responses appropriately.`;

export function getChatSystemPrompt(customPrompt?: string): string {
  // Similar to existing prompt functions but for chat
  if (customPrompt?.trim()) {
    return `${customPrompt}\n\n${CHAT_SYSTEM_PROMPT}`;
  }
  return CHAT_SYSTEM_PROMPT;
}
```

### 8. Storage Considerations

#### Settings Storage
Add to Chrome sync storage:
```typescript
interface Settings {
  // ... existing settings
  chatSettings?: {
    enabled: boolean;
    defaultOpen: boolean;  // Open chat on page load
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  };
}
```

#### Future: Chat History Storage
Use Chrome local storage for chat history (Phase 2):
```typescript
interface ChatHistory {
  conversations: {
    id: string;
    url: string;
    timestamp: number;
    messages: Message[];
  }[];
}
```

### 9. Error Handling

Reuse existing error handling patterns:
- API key missing → Show API key error UI
- Network errors → Display connection error
- Rate limiting → Show rate limit message
- Model errors → Fallback to default model

### 10. Testing Requirements

#### Manual Testing Checklist
- [ ] Chat opens/closes with keybind
- [ ] Messages send and receive responses
- [ ] UI works across different websites
- [ ] Escape key closes chat
- [ ] Chat persists during page navigation (iframe consideration)
- [ ] Mobile responsive design
- [ ] Dark/light theme compatibility

#### Edge Cases to Test
- Multiple tabs with chat open
- Chat behavior during page redirects
- Interaction with existing autocomplete features
- Performance with long conversations
- Special characters and code formatting

## Implementation Steps (Recommended Order)

1. **Create ChatUIManager class** with basic UI structure
2. **Add keybind configuration** to settings
3. **Implement message protocol** in background script
4. **Connect UI to message system**
5. **Add chat-specific prompts**
6. **Integrate with content script**
7. **Test basic functionality**
8. **Polish UI and animations**
9. **Add error handling**
10. **Comprehensive testing**

## Code Structure Guidelines

### File Organization
```
src/
├── content/
│   ├── index.ts (modified)
│   ├── chat-ui-manager.ts (NEW)
│   └── chat-styles.ts (NEW)
├── background/
│   ├── index.ts (modified)
│   ├── prompts.ts (modified)
│   └── chat-handler.ts (NEW - optional)
├── popup/
│   └── Popup.tsx (modified - add chat settings)
└── utils/
    └── chat-utils.ts (NEW - optional)
```

### Naming Conventions
- Classes: `ChatUIManager`, `ChatMessage`
- Functions: `handleChatMessage`, `createChatUI`
- Events: `OPEN_CHAT`, `SEND_CHAT_MESSAGE`, `CHAT_RESPONSE`
- CSS classes: `.ai-autocomplete-chat`, `.chat-message`, `.chat-input`

## UI/UX Considerations

### Accessibility
- Keyboard navigation support (Tab through messages)
- ARIA labels for screen readers
- High contrast mode support
- Escape key to close

### Performance
- Lazy load chat UI (only create when first opened)
- Debounce message sending
- Virtual scrolling for long conversations (Phase 2)
- Minimize DOM operations

### User Experience
- Clear visual feedback during loading
- Smooth animations
- Persistent input during response wait
- Copy button for AI responses
- Clear conversation button

## Future Enhancements (Phase 2 & 3)

### Phase 2: Enhanced UI and UX
- **Persistent chat history** across page reloads
- **Markdown rendering** for formatted responses
- **Code syntax highlighting**
- **Resizable chat window**
- **Minimize/maximize functionality**
- **Export conversation** feature

### Phase 3: Advanced Features
- **Conversation memory** using OpenRouter's context management
- **Multiple conversations** with tab interface
- **Voice input** using Web Speech API
- **File attachments** for context
- **Custom chat prompts** per website
- **Integration with page content** (select text to add to chat)

## Security Considerations

1. **Input Sanitization**: Sanitize all user inputs before display
2. **XSS Prevention**: Use textContent instead of innerHTML
3. **Content Security Policy**: Ensure compatibility with strict CSP
4. **API Key Protection**: Never expose API key in content script
5. **Rate Limiting**: Implement client-side rate limiting

## Performance Metrics

### Target Metrics
- Chat open time: < 100ms
- Message send latency: < 50ms (to backend)
- UI responsiveness: 60 FPS animations
- Memory usage: < 10MB for chat UI
- Message history limit: 100 messages per conversation

## Risk Mitigation

### Technical Risks
1. **DOM Conflicts**: Use shadow DOM if needed
2. **Memory Leaks**: Proper cleanup on close
3. **API Costs**: Implement usage tracking
4. **Browser Compatibility**: Test across Chrome versions

### User Experience Risks
1. **Intrusive UI**: Make easily dismissible
2. **Accidental Triggers**: Require deliberate action
3. **Data Loss**: Auto-save draft messages
4. **Confusion with Autocomplete**: Clear visual distinction

## Success Criteria

### MVP Success Metrics
- [ ] Chat interface opens reliably on any webpage
- [ ] Messages send and receive without errors
- [ ] UI is responsive and non-intrusive
- [ ] Integration doesn't break existing features
- [ ] Performance impact < 5% on page load

### User Acceptance Criteria
- [ ] Intuitive to open and use
- [ ] Faster than switching to ChatGPT/Claude
- [ ] Maintains context of current webpage
- [ ] Provides helpful responses
- [ ] Easy to dismiss when not needed

## Conclusion

This implementation plan provides a clear roadmap for adding chat functionality to the AI Autocomplete extension. By leveraging existing infrastructure and following established patterns, we can implement a robust chat feature with minimal risk to existing functionality.

The phased approach allows for quick MVP delivery while maintaining flexibility for future enhancements. The architecture is designed to scale from simple single-message interactions to full conversation management with memory.

### Next Steps
1. Review and approve this plan
2. Create feature branch for development
3. Implement Phase 1 MVP
4. Internal testing and refinement
5. Beta release to selected users
6. Gather feedback and iterate
7. Full release with Phase 2 features

---

*Document Version: 1.0*  
*Created: January 2025*  
*Status: Ready for Implementation*