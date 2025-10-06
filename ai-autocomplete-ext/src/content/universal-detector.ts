// Universal Text Input Detector Module
import { logger } from './content-logger';

export interface TextElement {
  element: HTMLElement;
  type: 'input' | 'textarea' | 'contenteditable' | 'codemirror' | 'ace' | 'monaco' | 'quill' | 'tinymce' | 'ckeditor' | 'prosemirror' | 'slate' | 'unknown';
  getText: () => string;
  setText: (text: string) => void;
  insertText: (text: string) => void;
}

// Editor Detection Functions
function getCodeMirrorInstance(element: HTMLElement): any {
  // CodeMirror v5
  const cm5Element = element.closest('.CodeMirror') as any;
  if (cm5Element?.CodeMirror) {
    return cm5Element.CodeMirror;
  }
  
  // CodeMirror v6
  const cm6Element = element.closest('.cm-editor') as any;
  if (cm6Element?.cmView?.view) {
    return cm6Element.cmView.view;
  }
  
  return null;
}

function getAceEditor(element: HTMLElement): any {
  // Check if element is part of Ace editor
  const aceElement = element.closest('.ace_editor');
  if (aceElement && (window as any).ace) {
    return (window as any).ace.edit(aceElement);
  }
  return null;
}

function getMonacoEditor(element: HTMLElement): any {
  // Check for Monaco editor
  const monacoElement = element.closest('.monaco-editor');
  if (monacoElement && (window as any).monaco) {
    // Try to find the editor instance
    const editors = (window as any).monaco.editor.getEditors();
    for (const editor of editors) {
      if (monacoElement.contains(editor.getDomNode())) {
        return editor;
      }
    }
  }
  return null;
}

function getQuillEditor(element: HTMLElement): any {
  // Check for Quill editor
  const quillContainer = element.closest('.ql-container');
  if (quillContainer && (window as any).Quill) {
    return (window as any).Quill.find(quillContainer);
  }
  return null;
}

function getTinyMCEEditor(element: HTMLElement): any {
  // Check for TinyMCE
  if ((window as any).tinyMCE) {
    // Try to find by element ID or closest editor
    const editor = (window as any).tinyMCE.get(element.id);
    if (editor) return editor;
    
    // Check if element is within TinyMCE
    const mceElement = element.closest('.mce-content-body, .tox-edit-area');
    if (mceElement) {
      const editors = (window as any).tinyMCE.editors;
      for (const editor of editors) {
        if (editor.getBody() === mceElement || editor.getContainer().contains(mceElement)) {
          return editor;
        }
      }
    }
  }
  return null;
}

function getCKEditor(element: HTMLElement): any {
  // Check for CKEditor 4
  if ((window as any).CKEDITOR) {
    const instance = (window as any).CKEDITOR.instances;
    for (const key in instance) {
      if (instance[key].element.$ === element || instance[key].container.$.contains(element)) {
        return instance[key];
      }
    }
  }
  
  // Check for CKEditor 5
  const cke5Element = element.closest('.ck-editor');
  if (cke5Element && (cke5Element as any).ckeditorInstance) {
    return (cke5Element as any).ckeditorInstance;
  }
  
  return null;
}

// Universal Element Detection
export function detectTextElement(element: HTMLElement | null): TextElement | null {
  if (!element) return null;
  
  // Check for code editors first (they often use contenteditable internally)
  const codeMirror = getCodeMirrorInstance(element);
  if (codeMirror) {
    return {
      element,
      type: 'codemirror',
      getText: () => codeMirror.getValue ? codeMirror.getValue() : codeMirror.state.doc.toString(),
      setText: (text: string) => codeMirror.setValue ? codeMirror.setValue(text) : codeMirror.dispatch({changes: {from: 0, to: codeMirror.state.doc.length, insert: text}}),
      insertText: (text: string) => {
        if (codeMirror.replaceSelection) {
          codeMirror.replaceSelection(text);
        } else if (codeMirror.dispatch) {
          // CodeMirror 6
          const selection = codeMirror.state.selection.main;
          codeMirror.dispatch({
            changes: {from: selection.from, to: selection.to, insert: text}
          });
        }
      }
    };
  }
  
  const aceEditor = getAceEditor(element);
  if (aceEditor) {
    return {
      element,
      type: 'ace',
      getText: () => aceEditor.getValue(),
      setText: (text: string) => aceEditor.setValue(text),
      insertText: (text: string) => aceEditor.insert(text)
    };
  }
  
  const monacoEditor = getMonacoEditor(element);
  if (monacoEditor) {
    return {
      element,
      type: 'monaco',
      getText: () => monacoEditor.getValue(),
      setText: (text: string) => monacoEditor.setValue(text),
      insertText: (text: string) => {
        const selection = monacoEditor.getSelection();
        const id = { major: 1, minor: 1 };
        const op = {
          identifier: id,
          range: selection,
          text: text,
          forceMoveMarkers: true
        };
        monacoEditor.executeEdits("ai-autocomplete", [op]);
      }
    };
  }
  
  // Check for rich text editors
  const quillEditor = getQuillEditor(element);
  if (quillEditor) {
    return {
      element,
      type: 'quill',
      getText: () => quillEditor.getText(),
      setText: (text: string) => quillEditor.setText(text),
      insertText: (text: string) => {
        const range = quillEditor.getSelection() || { index: 0 };
        quillEditor.insertText(range.index, text);
      }
    };
  }
  
  const tinyMCE = getTinyMCEEditor(element);
  if (tinyMCE) {
    return {
      element,
      type: 'tinymce',
      getText: () => tinyMCE.getContent({ format: 'text' }),
      setText: (text: string) => tinyMCE.setContent(text),
      insertText: (text: string) => tinyMCE.insertContent(text)
    };
  }
  
  const ckEditor = getCKEditor(element);
  if (ckEditor) {
    return {
      element,
      type: 'ckeditor',
      getText: () => ckEditor.getData ? ckEditor.getData() : ckEditor.data.get(),
      setText: (text: string) => ckEditor.setData ? ckEditor.setData(text) : ckEditor.data.set(text),
      insertText: (text: string) => {
        if (ckEditor.insertText) {
          ckEditor.insertText(text);
        } else if (ckEditor.model) {
          // CKEditor 5
          ckEditor.model.change((writer: any) => {
            ckEditor.model.insertContent(writer.createText(text));
          });
        }
      }
    };
  }
  
  // Check for standard HTML inputs
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    return {
      element,
      type: element.tagName.toLowerCase() as 'input' | 'textarea',
      getText: () => inputElement.value,
      setText: (text: string) => { inputElement.value = text; },
      insertText: (text: string) => {
        const start = inputElement.selectionStart || inputElement.value.length;
        const end = inputElement.selectionEnd || start;
        inputElement.value = inputElement.value.slice(0, start) + text + inputElement.value.slice(end);
        inputElement.selectionStart = inputElement.selectionEnd = start + text.length;
      }
    };
  }
  
  // Check for contenteditable
  if (element.isContentEditable || element.contentEditable === 'true') {
    return {
      element,
      type: 'contenteditable',
      getText: () => element.innerText || element.textContent || '',
      setText: (text: string) => { element.innerText = text; },
      insertText: (text: string) => {
        element.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          document.execCommand('insertText', false, text);
        }
      }
    };
  }
  
  return null;
}

// Find all text elements on page
export function findAllTextElements(): TextElement[] {
  const elements: TextElement[] = [];
  const processed = new Set<HTMLElement>();
  
  // Standard selectors
  const selectors = [
    'input[type="text"]',
    'input[type="search"]',
    'input[type="email"]',
    'input[type="url"]',
    'input:not([type])',
    'textarea',
    '[contenteditable="true"]',
    '[contenteditable=""]',
    '[role="textbox"]',
    '[role="searchbox"]',
    '[role="combobox"]',
    // YouTube specific
    'input#search',
    'ytd-searchbox input',
    'input.ytd-searchbox',
    // Other editors
    '.CodeMirror',
    '.cm-editor',
    '.ace_editor',
    '.monaco-editor',
    '.ql-editor',
    '.mce-content-body',
    '.ck-content'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((el) => {
      const element = el as HTMLElement;
      if (!processed.has(element)) {
        const textElement = detectTextElement(element);
        if (textElement) {
          elements.push(textElement);
          processed.add(element);
        }
      }
    });
  });
  
  // Check shadow DOMs
  const shadowRoots = findAllShadowRoots(document.body);
  shadowRoots.forEach(shadowRoot => {
    selectors.forEach(selector => {
      shadowRoot.querySelectorAll(selector).forEach((el) => {
        const element = el as HTMLElement;
        if (!processed.has(element)) {
          const textElement = detectTextElement(element);
          if (textElement) {
            elements.push(textElement);
            processed.add(element);
          }
        }
      });
    });
  });
  
  return elements;
}

// Find all shadow roots recursively
export function findAllShadowRoots(element: Element): ShadowRoot[] {
  const shadows: ShadowRoot[] = [];
  
  if (element.shadowRoot) {
    shadows.push(element.shadowRoot);
    shadows.push(...findAllShadowRoots(element.shadowRoot as unknown as Element));
  }
  
  element.querySelectorAll('*').forEach(child => {
    if (child.shadowRoot) {
      shadows.push(child.shadowRoot);
      shadows.push(...findAllShadowRoots(child.shadowRoot as unknown as Element));
    }
  });
  
  return shadows;
}

// Get the most likely active text element
export function getActiveTextElement(): TextElement | null {
  const activeElement = document.activeElement as HTMLElement;
  
  // Direct check
  let textElement = detectTextElement(activeElement);
  if (textElement) return textElement;
  
  // Check if active element is an iframe
  if (activeElement?.tagName === 'IFRAME') {
    try {
      const iframeDoc = (activeElement as HTMLIFrameElement).contentDocument;
      const iframeActive = iframeDoc?.activeElement as HTMLElement;
      textElement = detectTextElement(iframeActive);
      if (textElement) return textElement;
    } catch (e) {
      // Cross-origin iframe
    }
  }
  
  // Check if we're inside a shadow root
  const shadowHost = activeElement?.getRootNode();
  if (shadowHost && shadowHost !== document) {
    const shadowActive = (shadowHost as ShadowRoot).activeElement as HTMLElement;
    textElement = detectTextElement(shadowActive);
    if (textElement) return textElement;
  }
  
  // Check parent elements (for editors that use nested structures)
  let parent = activeElement?.parentElement;
  while (parent && parent !== document.body) {
    textElement = detectTextElement(parent);
    if (textElement) return textElement;
    parent = parent.parentElement;
  }
  
  return null;
}

// Selection-based text extraction
// This works even on sites where we can't detect the actual input element
export function getSelectedText(): string {
  // Primary: Check main window selection
  let selection = window.getSelection()?.toString() || '';
  
  // If we found text in main window, return it
  if (selection && selection.trim().length > 0) {
    logger.log('📝 Found selected text in main window:', selection.substring(0, 50) + '...');
    return selection;
  }
  
  // Secondary: Check all accessible iframes
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeWindow = (iframe as HTMLIFrameElement).contentWindow;
      if (iframeWindow) {
        const iframeSelection = iframeWindow.getSelection()?.toString();
        if (iframeSelection && iframeSelection.trim().length > 0) {
          logger.log('📝 Found selected text in iframe:', iframeSelection.substring(0, 50) + '...');
          return iframeSelection;
        }
      }
    } catch (e) {
      // Cross-origin iframe, skip
      logger.log('⚠️ Cannot access iframe (cross-origin)');
    }
  }
  
  // Tertiary: Check shadow DOMs
  const shadowRoots = findAllShadowRoots(document.body);
  for (const shadowRoot of shadowRoots) {
    // Shadow roots don't have getSelection, but we can check if activeElement is within
    const shadowActiveElement = (shadowRoot as any).activeElement;
    if (shadowActiveElement) {
      // Try to get selection from within shadow DOM
      const shadowSelection = window.getSelection()?.toString();
      if (shadowSelection && shadowSelection.trim().length > 0) {
        logger.log('📝 Found selected text in shadow DOM:', shadowSelection.substring(0, 50) + '...');
        return shadowSelection;
      }
    }
  }
  
  logger.log('❌ No text selection found anywhere');
  return '';
}