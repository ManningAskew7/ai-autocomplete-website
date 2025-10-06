# Text Extraction Methods for AI Autocomplete Extension

## Overview
This document outlines all researched and implemented text extraction methods for the AI Autocomplete browser extension, ordered by reliability and coverage.

---

## Currently Implemented Methods

### 1. Standard Field Detection via Universal Detector
**Technical Details:**
- Uses `detectTextElement()` to identify input types
- Supports: `<input>`, `<textarea>`, `contenteditable` elements
- Detects specialized editors: CodeMirror, Monaco, Ace, Quill, TinyMCE, CKEditor
- Accesses via DOM properties: `.value`, `.innerText`, `.textContent`

**Pros:**
- ✅ Most accurate - gets complete field content
- ✅ Works with 60% of websites
- ✅ Native support for major code editors
- ✅ Clean, direct access to text

**Cons:**
- ❌ Fails on canvas-based editors (Google Docs)
- ❌ Cannot access cross-origin iframes
- ❌ Misses some React/Vue synthetic inputs
- ❌ Doesn't work with custom shadow DOM implementations

---

### 2. Selection-Based Text Extraction
**Technical Details:**
- Uses `window.getSelection().toString()`
- Recursively checks iframes: `iframe.contentWindow.getSelection()`
- Searches shadow DOMs via `findAllShadowRoots()`
- Fallback when no input field is detected

**Pros:**
- ✅ Works on any visible text
- ✅ User-controlled (explicit selection)
- ✅ Works on canvas-rendered text (if selectable)
- ✅ No privacy concerns

**Cons:**
- ❌ Requires manual text selection
- ❌ Limited context (only selected portion)
- ❌ Extra step for users
- ❌ Doesn't work on non-selectable content

---

### 3. Keyboard Buffer (Keylogger) - Opt-in
**Technical Details:**
- Captures `keypress`, `paste`, and `beforeunload` events
- Maintains 300-character sliding window
- Stores in memory: `private buffer: string`
- Auto-clears after 5 minutes or navigation
- Excludes password/credit card fields

**Pros:**
- ✅ Works on ANY website (including Google Docs)
- ✅ Captures typing context
- ✅ No DOM dependency
- ✅ Includes AI completions for continuity

**Cons:**
- ❌ Privacy concerns (requires clear opt-in)
- ❌ Misses external paste from other apps
- ❌ Doesn't capture existing field text
- ❌ Cross-field contamination risk

---

## Researched Alternative Methods

### 4. Global Input Event Listeners
**Technical Details:**
```javascript
document.addEventListener('input', (e) => {
  const text = e.target.value || e.target.innerText;
}, true); // Use capture phase
```
- Listens for `input` and `beforeinput` events
- Captures at document level in capture phase
- Works with paste, voice input, autocomplete

**Pros:**
- ✅ Captures ALL text changes (not just keystrokes)
- ✅ Gets complete field content
- ✅ Works with paste, autocomplete, voice
- ✅ No privacy concerns

**Cons:**
- ❌ May miss custom editors
- ❌ Performance overhead on busy pages
- ❌ Still can't access canvas elements
- ❌ Requires active element detection

---

### 5. Focus Event with Text Extraction
**Technical Details:**
```javascript
document.addEventListener('focusin', (e) => {
  const text = e.target.value || e.target.innerText || e.target.textContent;
});
```
- Triggers on `focusin`/`focus` events
- Extracts existing text from focused element
- Updates context when switching fields

**Pros:**
- ✅ Gets existing field content
- ✅ Prevents cross-field contamination
- ✅ Works with field switching
- ✅ Lightweight implementation

**Cons:**
- ❌ Only triggers on focus change
- ❌ May not work with all custom editors
- ❌ Doesn't capture ongoing changes
- ❌ Canvas elements don't fire focus events

---

### 6. Composition Events for IME
**Technical Details:**
```javascript
document.addEventListener('compositionstart', handler);
document.addEventListener('compositionupdate', handler);
document.addEventListener('compositionend', handler);
```
- Captures Input Method Editor events
- Essential for Chinese, Japanese, Korean input
- Provides intermediate composition states

**Pros:**
- ✅ Essential for international users
- ✅ Captures complex character composition
- ✅ Standard browser API
- ✅ Works with all IME systems

**Cons:**
- ❌ Only for IME input
- ❌ Must be combined with other methods
- ❌ Doesn't help with regular typing
- ❌ Limited use case

---

### 7. Caret Range/Position Tracking
**Technical Details:**
```javascript
// Standard API
const pos = document.caretPositionFromPoint(x, y);
// WebKit fallback
const range = document.caretRangeFromPoint(x, y);
```
- Gets text around specific coordinates
- Extracts from `range.startContainer`
- Works with mouse position tracking

**Pros:**
- ✅ Works with any visible text
- ✅ Can extract context around cursor
- ✅ Doesn't require focus
- ✅ Cross-browser support (with fallback)

**Cons:**
- ❌ Requires mouse coordinates
- ❌ Complex implementation
- ❌ May not work with all text rendering
- ❌ Canvas text not accessible

---

### 8. MutationObserver with Attribute Watching
**Technical Details:**
```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
      // Handle value attribute change
    }
  });
});
```
- Observes DOM changes
- Can track `contenteditable` changes
- Monitors dynamically added elements

**Pros:**
- ✅ Catches dynamic content
- ✅ Works with AJAX updates
- ✅ Can monitor shadow DOM changes
- ✅ Native browser API

**Cons:**
- ❌ Cannot observe `value` property (only attribute)
- ❌ Performance overhead
- ❌ Complex configuration
- ❌ Requires workarounds for input fields

---

### 9. Selection Change Monitoring
**Technical Details:**
```javascript
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString();
});
```
- Fires when text selection changes
- Provides cursor context
- Works with `Range` API

**Pros:**
- ✅ Real-time cursor tracking
- ✅ Works with text selection
- ✅ Lightweight
- ✅ Standard API

**Cons:**
- ❌ Only fires on selection changes
- ❌ Doesn't capture all typing
- ❌ Limited to selectable content
- ❌ Not useful for input fields

---

### 10. EditContext API (Chrome/Edge 121+)
**Technical Details:**
```javascript
const editContext = new EditContext();
element.editContext = editContext;
const text = editContext.text;
```
- Modern API for custom editors
- Designed for canvas-based editing
- Direct text model access

**Pros:**
- ✅ Works with canvas editors
- ✅ Modern, purpose-built API
- ✅ Direct text access
- ✅ Handles IME natively

**Cons:**
- ❌ Chrome/Edge only (121+, Jan 2024)
- ❌ Requires site implementation
- ❌ Limited browser support
- ❌ Not backward compatible

---

### 11. Clipboard API Monitoring
**Technical Details:**
```javascript
navigator.clipboard.readText().then(text => {
  // Process clipboard content
});
```
- Reads clipboard content
- Requires explicit permission
- Can detect paste events

**Pros:**
- ✅ Captures paste content
- ✅ Works across all sites
- ✅ Simple API

**Cons:**
- ❌ Major privacy concerns
- ❌ Requires permission prompt
- ❌ Only for clipboard operations
- ❌ Users may reject permission

---

### 12. Shadow DOM Piercing
**Technical Details:**
```javascript
// Override attachShadow
const original = Element.prototype.attachShadow;
Element.prototype.attachShadow = function(options) {
  const shadow = original.call(this, options);
  // Monitor shadow root
  return shadow;
};
```
- Intercepts shadow root creation
- Recursively searches shadow trees
- Monitors nested shadow DOMs

**Pros:**
- ✅ Access to encapsulated content
- ✅ Works with web components
- ✅ Catches modern UI frameworks

**Cons:**
- ❌ Performance overhead
- ❌ May break some sites
- ❌ Complex implementation
- ❌ Still can't access closed shadows

---

## Recommended Priority Order

### Smart Cascade System (Proposed)
1. **Standard field detection** - Try universal detector first
2. **Global input event listeners** - Capture all text changes
3. **Focus event extraction** - Handle field switching
4. **Selection-based extraction** - User-controlled fallback
5. **Composition events** - IME support layer
6. **Keyboard buffer** - Last resort for canvas sites

### Expected Coverage
- Methods 1-2: ~75% of websites
- Methods 1-3: ~80% of websites
- Methods 1-4: ~85% of websites
- Methods 1-5: ~88% of websites (with international support)
- Methods 1-6: ~95%+ of websites (including Google Docs)

---

## Implementation Notes

### Performance Considerations
- Use event delegation where possible
- Debounce high-frequency events
- Limit MutationObserver scope
- Cache detected elements

### Privacy Guidelines
- Always prioritize non-invasive methods
- Require explicit opt-in for tracking
- Clear data on navigation
- Exclude sensitive fields

### Browser Compatibility
- Test across Chrome, Firefox, Safari, Edge
- Provide fallbacks for proprietary APIs
- Handle both modern and legacy approaches
- Consider mobile browser differences

---

## Conclusion
The optimal approach combines multiple methods in a cascade system, starting with the most accurate and least invasive methods, falling back to more aggressive techniques only when necessary. This ensures maximum compatibility while respecting user privacy and maintaining good performance.