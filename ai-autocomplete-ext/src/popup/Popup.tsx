import { useState, useEffect } from 'react';
import { popupLogger as logger } from '../utils/logger';
// PREMIUM_TOGGLE: Uncomment when re-enabling premium features
// import { getSubscriptionDetails, openPaymentPage } from '../utils/premium';
// PREMIUM_TOGGLE: Uncomment when re-enabling premium features
// import { getExtPayForPopup, openCustomerPortal } from '../utils/licensing';
import { storeApiKey, retrieveApiKey } from '../utils/security';
import { 
  getInjectionMode, 
  setInjectionMode,
  isDeveloperModeEnabled,
  toggleDeveloperMode, 
  INJECTION_MODE_INFO,
  type InjectionMode 
} from '../utils/privacy';
import './styles.css';

interface Model {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
  };
}

interface Keybinds {
  trigger: string;
  accept: string;
  cycle: string;
  dismiss: string;
  rewrite: string;
  manualInject: string;
}

type CompletionMode = 'short' | 'medium' | 'long';

interface Settings {
  apiKey: string;
  selectedModel: string;
  modelSettings: {
    temperature: number;
    maxTokens: number;
  };
  customSystemPrompt: string;
  enhancedDetection: boolean;
  keybinds: Keybinds;
  completionMode: CompletionMode;
}

const Popup = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'privacy' | 'keybinds'>('general');
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    selectedModel: 'google/gemini-2.5-flash-lite',
    modelSettings: {
      temperature: 0.7,
      maxTokens: 100
    },
    customSystemPrompt: '',
    enhancedDetection: false,
    keybinds: {
      trigger: 'ctrl+space',
      accept: 'arrowright',
      cycle: 'tab',
      dismiss: 'escape',
      rewrite: 'alt+shift+r',
      manualInject: 'ctrl+shift+space'
    },
    completionMode: 'short'
  });
  
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning' | 'info' | null; message: string }>({ type: null, message: '' });
  
  // Premium subscription state
  // PREMIUM_TOGGLE: Change isPremium to false and planName to 'Free' to re-enable premium
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_subscription, _setSubscription] = useState<{
    isPremium: boolean;
    planName: string;
    trialDaysRemaining?: number;
  }>({ isPremium: true, planName: 'All Features Unlocked' }); // Free launch - all features available
  
  // Injection mode state
  const [injectionMode, setInjectionModeState] = useState<InjectionMode>('conservative');
  const [modePermissions, setModePermissions] = useState<Record<InjectionMode, boolean>>({
    conservative: true,
    balanced: false,
    aggressive: false
  });
  const [developerMode, setDeveloperModeState] = useState(false);

  // Load settings and models on mount
  useEffect(() => {
    // Listen for permission errors from background script
    const handleMessage = (message: any) => {
      if (message.type === 'PERMISSION_ERROR') {
        setStatus({ 
          type: 'error', 
          message: `${message.mode} mode failed: ${message.message}. Please try selecting the mode again.`
        });
        // Reload current mode in case it reverted
        loadInjectionMode();
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    // Load saved settings
    const loadSettings = async () => {
      // Get encrypted API key
      const apiKey = await retrieveApiKey();
      
      chrome.storage.sync.get(['selectedModel', 'modelSettings', 'customSystemPrompt', 'enhancedDetection', 'keybinds', 'completionMode'], (result) => {
        setSettings({
          apiKey: apiKey || '',
          selectedModel: result.selectedModel || 'google/gemini-2.5-flash-lite',
          modelSettings: result.modelSettings || { temperature: 0.7, maxTokens: 100 },
          customSystemPrompt: result.customSystemPrompt || '',
          enhancedDetection: result.enhancedDetection || false,
          keybinds: result.keybinds || {
            trigger: 'ctrl+space',
            accept: 'arrowright',
            cycle: 'tab',
            dismiss: 'escape',
            rewrite: 'alt+shift+r',
            manualInject: 'ctrl+shift+space'
          },
          completionMode: result.completionMode || 'short'
        });
      });
    };
    
    loadSettings();

    // Fetch models
    fetchModels();
    
    // PREMIUM_TOGGLE: Uncomment to re-enable subscription checking
    // loadSubscriptionStatus();
    
    // Load injection mode
    loadInjectionMode();
    
    // Inject content script into active tab when popup opens
    chrome.runtime.sendMessage({ type: 'INJECT_CONTENT_SCRIPT' }, (response) => {
      if (response?.success) {
        logger.log('Content script injected successfully');
      } else {
        logger.log('Failed to inject content script:', response?.error);
      }
    });
    
    // Cleanup message listener
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);
  
  const loadInjectionMode = async () => {
    try {
      const mode = await getInjectionMode();
      setInjectionModeState(mode);
      
      // Load developer mode state
      const devMode = await isDeveloperModeEnabled();
      setDeveloperModeState(devMode);
      
      // Check permissions for each mode
      const { checkInjectionModePermissions } = await import('../utils/privacy');
      const permissions: Record<InjectionMode, boolean> = {
        conservative: true, // Always has permissions
        balanced: await checkInjectionModePermissions('balanced'),
        aggressive: await checkInjectionModePermissions('aggressive')
      };
      setModePermissions(permissions);
    } catch (error) {
      logger.error('Failed to load injection mode:', error);
    }
  };
  
  const handleInjectionModeChange = (mode: InjectionMode) => {
    // Just update the local state, don't save yet
    setInjectionModeState(mode);
  };
  
  // PREMIUM_TOGGLE: Uncomment when re-enabling premium features
  /*
  const handleUpgradeClick = async () => {
    try {
      await openPaymentPage(true);
      // Reload subscription status after payment page closes
      setTimeout(loadSubscriptionStatus, 2000);
    } catch (error) {
      logger.error('Failed to open payment page:', error);
      setStatus({ 
        type: 'error', 
        message: 'Failed to open payment page. Please try again.' 
      });
    }
  };
  */
  
  // PREMIUM_TOGGLE: Uncomment when re-enabling premium features
  /*
  const loadSubscriptionStatus = async () => {
    try {
      const details = await getSubscriptionDetails();
      setSubscription({
        isPremium: details.isPremium,
        planName: details.planName,
        trialDaysRemaining: details.trialDaysRemaining
      });
    } catch (error) {
      logger.error('Failed to load subscription status:', error);
    }
  };
  */

  const fetchModels = async () => {
    setLoading(true);
    try {
      // First try to get from storage
      const stored = await chrome.storage.local.get(['availableModels']);
      if (stored.availableModels && stored.availableModels.length > 0) {
        setModels(stored.availableModels);
        setFilteredModels(stored.availableModels);
        setLoading(false);
      }

      // Then request fresh data from background
      chrome.runtime.sendMessage({ type: 'GET_MODELS' }, (response) => {
        if (response?.models && response.models.length > 0) {
          setModels(response.models);
          setFilteredModels(response.models);
        }
        setLoading(false);
      });
    } catch (error) {
      logger.error('Failed to fetch models:', error);
      setLoading(false);
    }
  };

  // Filter models based on search
  useEffect(() => {
    let filtered = models;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(query) || 
        m.id.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }

    setFilteredModels(filtered);
  }, [models, searchQuery]);

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      // Save injection mode if it changed
      const currentMode = await getInjectionMode();
      if (currentMode !== injectionMode) {
        setStatus({ type: 'info', message: 'Requesting permissions for injection mode...' });
        const success = await setInjectionMode(injectionMode);
        
        if (!success) {
          setStatus({ 
            type: 'error', 
            message: `Failed to set ${injectionMode} mode. Please grant all requested permissions when prompted.`
          });
          // Revert to previous mode
          setInjectionModeState(currentMode);
          // Reload permissions status
          loadInjectionMode();
          setSaving(false);
          return;
        }
        
        // Send message to background to reinitialize injection mode
        setStatus({ type: 'info', message: 'Reinitializing injection mode...' });
        
        // Wait for response using a promise
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage({ type: 'REINITIALIZE_INJECTION_MODE' }, (response) => {
            if (response?.success) {
              logger.log('Injection mode reinitialized successfully');
              setStatus({ 
                type: 'success', 
                message: `Successfully switched to ${injectionMode} mode. The extension will now inject based on the new settings.`
              });
              // Reload permissions status
              loadInjectionMode();
            } else {
              setStatus({ 
                type: 'error', 
                message: 'Failed to reinitialize injection mode. Please reload the extension.'
              });
            }
            resolve();
          });
        });
      }
      
      // Store API key using encrypted storage
      await storeApiKey(settings.apiKey);
      
      // Store other settings normally
      await chrome.storage.sync.set({
        selectedModel: settings.selectedModel,
        modelSettings: settings.modelSettings,
        customSystemPrompt: settings.customSystemPrompt,
        enhancedDetection: settings.enhancedDetection,
        keybinds: settings.keybinds,
        completionMode: settings.completionMode
      });

      setStatus({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => {
        setStatus({ type: null, message: '' });
      }, 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: string) => {
    const p = parseFloat(price);
    if (p === 0) return 'Free';
    if (p < 0.000001) return `$${(p * 1000000).toFixed(3)}/M`;
    if (p < 0.001) return `$${(p * 1000).toFixed(3)}/K`;
    return `$${p.toFixed(4)}`;
  };

  const formatContextLength = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
    return length.toString();
  };

  // Get currently selected model details
  const selectedModelDetails = models.find(m => m.id === settings.selectedModel);

  return (
    <div className="container">
      <div className="header">
        <h1>
          AI Autocomplete
        </h1>
        <div className="version">v0.2.0 - Dynamic Model Selection</div>
        
        {/* PREMIUM_TOGGLE: Uncomment this section to re-enable subscription status UI
        <div className="subscription-status">
          <span className={`plan-badge ${subscription.isPremium ? 'premium' : 'free'}`}>
            {subscription.planName}
            {subscription.trialDaysRemaining !== undefined && subscription.trialDaysRemaining > 0 && 
              ` (${subscription.trialDaysRemaining} days left)`
            }
          </span>
          {!subscription.isPremium && (
            <button 
              className="upgrade-btn"
              onClick={async () => {
                try {
                  await openPaymentPage(true);
                  setTimeout(loadSubscriptionStatus, 2000);
                } catch (error) {
                  logger.error('Failed to open payment page:', error);
                }
              }}
            >
              Upgrade to Premium
            </button>
          )}
          {subscription.isPremium && (
            <button 
              className="manage-subscription-btn"
              onClick={async () => {
                try {
                  const extpay = getExtPayForPopup();
                  await openCustomerPortal(extpay);
                } catch (error) {
                  logger.error('Failed to open customer portal:', error);
                }
              }}
              title="Manage Subscription"
            >
              ⚙️
            </button>
          )}
        </div>
        */}
        
        {selectedModelDetails && (
          <div className="current-model">
            <span className="current-model-label">Active Model: </span>
            <span className="current-model-name">{selectedModelDetails.name}</span>
            <span className={`model-price ${parseFloat(selectedModelDetails.pricing.prompt) === 0 ? '' : 'paid'}`}>
              ({formatPrice(selectedModelDetails.pricing.prompt)}/token)
            </span>
          </div>
        )}
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button 
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
        <button 
          className={`tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy
        </button>
        <button 
          className={`tab ${activeTab === 'keybinds' ? 'active' : ''}`}
          onClick={() => setActiveTab('keybinds')}
        >
          Keybinds
        </button>
      </div>

      <div className={`tab-content ${activeTab === 'general' ? 'active' : ''}`}>
        <div className="section">
          <div className="form-group">
            <label htmlFor="apiKey">OpenRouter API Key</label>
            <input
              id="apiKey"
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-or-v1-..."
            />
            <div className="help-text">
              Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/keys</a>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="form-group">
            <label htmlFor="completionMode">Completion Mode</label>
            <select
              id="completionMode"
              className="mode-dropdown"
              value={settings.completionMode}
              onChange={(e) => setSettings({ ...settings, completionMode: e.target.value as CompletionMode })}
            >
              <option value="short">Short (5-20 words)</option>
              <option value="medium">Medium (20-40 words)</option>
              <option value="long">Long (50-100 words)</option>
            </select>
            <div className="help-text">
              Press <strong>Shift+Alt+M</strong> to cycle through modes while typing
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            Model Selection
          </div>
          
          <div className="model-selector">
            <input
              type="text"
              className="model-search"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <div>Loading models...</div>
              </div>
            ) : (
              <div className="model-list">
                {filteredModels.length === 0 ? (
                  <div className="model-item">No models found</div>
                ) : (
                  filteredModels.map((model) => (
                    <div
                      key={model.id}
                      className={`model-item ${settings.selectedModel === model.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSettings({ ...settings, selectedModel: model.id });
                        logger.log(`Model selected: ${model.name} (${model.id})`);
                        setStatus({ type: 'warning', message: `Selected: ${model.name}. Remember to save!` });
                        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
                      }}
                    >
                      <div className="model-name">{model.name}</div>
                      <div className="model-info">
                        <span className={`model-price ${parseFloat(model.pricing.prompt) === 0 ? '' : 'paid'}`}>
                          {formatPrice(model.pricing.prompt)}/token
                        </span>
                        <span className="model-context">
                          Context: {formatContextLength(model.context_length)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'advanced' ? 'active' : ''}`}>
        <div className="section">
          <div className="section-title">Model Parameters</div>
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Temperature</span>
              <span className="slider-value">{settings.modelSettings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.modelSettings.temperature}
              onChange={(e) => setSettings({
                ...settings,
                modelSettings: {
                  ...settings.modelSettings,
                  temperature: parseFloat(e.target.value)
                }
              })}
            />
            <div className="help-text">
              Higher values make output more creative, lower values more focused
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Max Tokens</span>
              <span className="slider-value">{settings.modelSettings.maxTokens}</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={settings.modelSettings.maxTokens}
              onChange={(e) => setSettings({
                ...settings,
                modelSettings: {
                  ...settings.modelSettings,
                  maxTokens: parseInt(e.target.value)
                }
              })}
            />
            <div className="help-text">
              Automatically set by completion mode (Short: 100, Medium: 200, Long: 400)
            </div>
          </div>
        </div>
        
        <div className="section">
          <div className="section-title">
            Custom System Prompt
            {/* PREMIUM_TOGGLE: Uncomment to show premium label
            {!subscription.isPremium && (
              <span className="premium-label-black">PREMIUM</span>
            )}
            */}
          </div>
          <div className="form-group custom-prompt-group">
            <div> {/* PREMIUM_TOGGLE: Add back className={!subscription.isPremium ? 'premium-feature' : ''} */}
              <textarea
                id="customPrompt"
                className="custom-prompt-textarea"
                value={settings.customSystemPrompt}
                onChange={(e) => {
                  // PREMIUM_TOGGLE: Uncomment to re-enable premium check
                  /*
                  if (!subscription.isPremium) {
                    setStatus({ 
                      type: 'warning', 
                      message: 'Custom prompts are a premium feature. Upgrade to unlock!' 
                    });
                    return;
                  }
                  */
                  // Enforce character limit
                  if (e.target.value.length <= 500) {
                    setSettings({ ...settings, customSystemPrompt: e.target.value });
                  }
                }}
                placeholder="e.g., 'Use formal, professional language' or 'Write in British English'..."
                maxLength={500}
                rows={5}
                // PREMIUM_TOGGLE: Add back disabled={!subscription.isPremium}
                // style={!subscription.isPremium ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
              {/* PREMIUM_TOGGLE: Uncomment to show lock overlay
              {!subscription.isPremium && (
                <div className="premium-lock-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
              )}
              */}
            </div>
            <div className="prompt-info">
              <div className="char-counter">
                <span className={settings.customSystemPrompt.length > 450 ? 'warning' : ''}>
                  {settings.customSystemPrompt.length}/500 characters
                </span>
              </div>
              <div className="help-text">
                Custom prompts extend the default behavior and enhance completion style
              </div>
              {/* PREMIUM_TOGGLE: Uncomment to show conditional help text
              {subscription.isPremium ? (
                <div className="help-text">
                  Custom prompts extend the default behavior and enhance completion style
                </div>
              ) : (
                <div className="help-text">
                  Upgrade to Premium to customize AI writing style and tone
                </div>
              )}
              */}
            </div>
          </div>
        </div>
        
        {/* PREMIUM_TOGGLE: Uncomment to show upgrade button
        {!subscription.isPremium && (
          <div className="section premium-upgrade-section">
            <button
              className="btn btn-primary"
              onClick={handleUpgradeClick}
              style={{ width: '100%' }}
            >
              Upgrade to Premium
            </button>
            <div className="help-text" style={{ marginTop: '8px', textAlign: 'center' }}>
              Unlock custom prompts and advanced features
            </div>
          </div>
        )}
        */}
      </div>

      <div className={`tab-content ${activeTab === 'privacy' ? 'active' : ''}`}>
        <div className="section">
          <div className="section-title">
            Content Script Injection Mode
          </div>
          
          <div style={{
            background: '#f0f4f8',
            border: '1px solid #cbd5e0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            Choose how aggressively the extension injects its content script. More aggressive modes provide better reliability but require additional permissions.
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            {(['conservative', 'balanced', 'aggressive'] as InjectionMode[]).map((mode) => {
              const modeInfo = INJECTION_MODE_INFO[mode];
              return (
                <div
                  key={mode}
                  style={{
                    background: injectionMode === mode ? '#e6f4ff' : '#ffffff',
                    border: `2px solid ${injectionMode === mode ? '#1890ff' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => !saving && handleInjectionModeChange(mode)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input
                      type="radio"
                      checked={injectionMode === mode}
                      onChange={() => !saving && handleInjectionModeChange(mode)}
                      disabled={saving}
                      style={{ marginTop: '2px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {modeInfo.name}
                        {mode === 'balanced' && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            background: '#10b981',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            RECOMMENDED
                          </span>
                        )}
                        {modeInfo.warning && !modePermissions[mode] && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            background: '#f59e0b',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            ⚠️ REQUIRES PERMISSIONS
                          </span>
                        )}
                        {modePermissions[mode] && mode !== 'conservative' && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            background: '#10b981',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            ✓ PERMISSIONS GRANTED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px' }}>
                        {modeInfo.description}
                      </div>
                      <ul style={{ 
                        margin: '0', 
                        paddingLeft: '20px', 
                        fontSize: '11px', 
                        color: '#6b7280' 
                      }}>
                        {modeInfo.details.map((detail, index) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                      {(modeInfo.permissions.length > 0 || (modeInfo as any).hostPermissions?.length > 0) && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          color: '#9ca3af'
                        }}>
                          {modeInfo.permissions.length > 0 && (
                            <div>Permissions: {modeInfo.permissions.join(', ')}</div>
                          )}
                          {(modeInfo as any).hostPermissions?.length > 0 && (
                            <div>Host access: All websites</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="section">
          <div className="section-title">
            Fallback Detection (For Difficult Sites)
          </div>
          
          <div className="privacy-notice" style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong>Privacy Notice:</strong> This is a <strong>last resort fallback</strong> for sites where normal detection fails (like Google Docs). When enabled, it temporarily stores the last 300 characters you type. This data:
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Is <strong>NEVER</strong> sent anywhere until you press Ctrl+Space</li>
                  <li>Is stored <strong>locally only</strong> in your browser's memory</li>
                  <li>Is <strong>automatically cleared</strong> when you navigate away or after 5 minutes of inactivity</li>
                  <li>Is <strong>only sent</strong> to your selected OpenRouter AI model when you trigger autocomplete</li>
                  <li><strong>Excludes</strong> password and credit card fields</li>
                  <li><strong>Note:</strong> External copy/paste from other apps may not be captured (AI completions are tracked)</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                Enable Fallback Detection
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Last resort for canvas-based sites (Google Docs, Figma, etc.)
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.enhancedDetection}
                onChange={(e) => setSettings({ ...settings, enhancedDetection: e.target.checked })}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          {settings.enhancedDetection && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #10b981',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#065f46'
            }}>
              ✅ Fallback detection is active. You'll see a red indicator dot on pages where keyboard tracking is enabled. Note: The extension now tries multiple detection methods before using this fallback.
            </div>
          )}

          <div className="help-text" style={{ marginTop: '16px' }}>
            <strong>How it works:</strong> The extension now uses smart detection that tries multiple methods before falling back to keystroke capture. This fallback is primarily needed for canvas-based sites (Google Docs, Figma) where normal text extraction fails. Most sites work without needing this option.
          </div>
        </div>

        {/* Manual Injection Info - Useful for Conservative Mode */}
        {injectionMode === 'conservative' && (
          <div className="section">
            <div className="section-title" style={{ color: '#059669' }}>
              ⌨️ Quick Activation Shortcut
            </div>
            
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#047857', 
                marginBottom: '12px',
                fontWeight: '500' 
              }}>
                In Conservative mode, quickly activate AI Autocomplete without opening the popup:
              </div>
              
              <div style={{
                background: 'white',
                border: '2px solid #10b981',
                borderRadius: '6px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
                  Ctrl + Shift + Space
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  (Cmd + Shift + Space on Mac)
                </div>
              </div>
              
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
                <strong>Note:</strong> This is a global keyboard shortcut that works on any page. 
                You can customize it in Chrome's extension shortcuts settings 
                (chrome://extensions/shortcuts).
              </div>
            </div>
          </div>
        )}
        
        {/* Developer Mode Section */}
        <div className="section">
          <div className="section-title" style={{ color: '#dc2626' }}>
            🚧 Developer Mode (Testing Only)
          </div>
          
          <div style={{
            background: '#fef2f2',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong>WARNING:</strong> Developer mode bypasses all permission checks and injects the extension everywhere automatically. This mode:
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Requests permission to <strong>read and change all your data on all websites</strong></li>
                  <li>Injects content scripts on <strong>every page</strong> automatically</li>
                  <li>Ignores injection mode settings above</li>
                  <li>Should <strong>ONLY</strong> be used for testing and development</li>
                  <li>Will require browser permission when first enabled</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#dc2626' }}>
                Enable Developer Mode
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                For testing only - grants all permissions automatically
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={developerMode}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  setDeveloperModeState(enabled);
                  
                  // Request permissions if enabling
                  if (enabled) {
                    try {
                      // Request permissions separately for better compatibility
                      const permissionsGranted = await chrome.permissions.request({
                        permissions: ['webNavigation', 'tabs']
                      });
                      
                      // Request all available host permissions from the manifest
                      const originsGranted = await chrome.permissions.request({
                        origins: ['https://*/*', 'http://localhost/*', 'file:///*']
                      });
                      
                      if (!permissionsGranted || !originsGranted) {
                        setDeveloperModeState(false);
                        setStatus({ 
                          type: 'error', 
                          message: 'Developer mode requires all permissions. Please grant them when prompted.' 
                        });
                        return;
                      }
                    } catch (error) {
                      console.error('Error requesting permissions:', error);
                      setDeveloperModeState(false);
                      setStatus({ 
                        type: 'error', 
                        message: 'Failed to request permissions. Please try again.' 
                      });
                      return;
                    }
                  }
                  
                  // Toggle developer mode
                  await toggleDeveloperMode(enabled);
                  setStatus({ 
                    type: enabled ? 'warning' : 'success', 
                    message: enabled 
                      ? '⚠️ Developer mode enabled - Extension will inject everywhere!' 
                      : 'Developer mode disabled'
                  });
                  
                  // Reload injection mode
                  loadInjectionMode();
                }}
              />
              <span className="switch-slider"></span>
            </label>
          </div>
          
          {developerMode && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #dc2626',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#991b1b',
              fontWeight: '600'
            }}>
              🚧 DEVELOPER MODE ACTIVE - Extension is injecting on all pages automatically. Remember to disable this before normal use!
            </div>
          )}
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'keybinds' ? 'active' : ''}`}>
        <div className="section">
          <div className="section-title">
            Keyboard Shortcuts
          </div>
          
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            ℹ️ Customize keyboard shortcuts to match your workflow. Changes apply immediately.
          </div>

          <div className="form-group">
            <label>Trigger Autocomplete</label>
            <select
              value={settings.keybinds.trigger}
              onChange={(e) => setSettings({
                ...settings,
                keybinds: { ...settings.keybinds, trigger: e.target.value }
              })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="ctrl+space">Ctrl + Space (Default)</option>
              <option value="alt+space">Alt + Space</option>
              <option value="ctrl+period">Ctrl + Period (.)</option>
              <option value="ctrl+enter">Ctrl + Enter</option>
            </select>
          </div>

          <div className="form-group">
            <label>Accept Suggestion</label>
            <select
              value={settings.keybinds.accept}
              onChange={(e) => setSettings({
                ...settings,
                keybinds: { ...settings.keybinds, accept: e.target.value }
              })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="arrowright">Right Arrow → (Default)</option>
              <option value="ctrl+enter">Ctrl + Enter</option>
              <option value="shift+enter">Shift + Enter</option>
              <option value="ctrl+period">Ctrl + Period (.)</option>
              <option value="enter">Enter</option>
            </select>
            <div className="help-text">Key to accept the current suggestion</div>
          </div>

          <div className="form-group">
            <label>Cycle Through Suggestions</label>
            <select
              value={settings.keybinds.cycle}
              onChange={(e) => setSettings({
                ...settings,
                keybinds: { ...settings.keybinds, cycle: e.target.value }
              })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="tab">Tab (Default)</option>
              <option value="arrowdown">Down Arrow ↓</option>
              <option value="ctrl+arrowdown">Ctrl + Down Arrow</option>
              <option value="alt+tab">Alt + Tab</option>
            </select>
            <div className="help-text">Key to browse multiple suggestions</div>
          </div>

          <div className="form-group">
            <label>Dismiss Suggestions</label>
            <select
              value={settings.keybinds.dismiss}
              onChange={(e) => setSettings({
                ...settings,
                keybinds: { ...settings.keybinds, dismiss: e.target.value }
              })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="escape">Escape (Default)</option>
              <option value="ctrl+escape">Ctrl + Escape</option>
              <option value="backspace">Backspace</option>
            </select>
            <div className="help-text">Key to cancel and hide suggestions</div>
          </div>
          <div className="form-group">
            <label>Rewrite Selected Text</label>
            <select
              value={settings.keybinds.rewrite}
              onChange={(e) => setSettings({
                ...settings,
                keybinds: { ...settings.keybinds, rewrite: e.target.value }
              })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="ctrl+shift+e">Ctrl + Shift + E</option>
              <option value="alt+shift+r">Alt + Shift + R (Default)</option>
              <option value="ctrl+alt+r">Ctrl + Alt + R</option>
              <option value="ctrl+shift+g">Ctrl + Shift + G</option>
              <option value="ctrl+shift+w">Ctrl + Shift + W</option>
            </select>
            <div className="help-text">Key to rewrite and improve selected text</div>
          </div>

          <div className="form-group">
            <label>Manual Inject Script</label>
            <select
              value={settings.keybinds.manualInject}
              onChange={(e) => setSettings({
                ...settings,
                keybinds: { ...settings.keybinds, manualInject: e.target.value }
              })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="ctrl+shift+space">Ctrl + Shift + Space (Default)</option>
              <option value="ctrl+shift+i">Ctrl + Shift + I</option>
              <option value="ctrl+shift+j">Ctrl + Shift + J</option>
              <option value="alt+shift+space">Alt + Shift + Space</option>
              <option value="ctrl+alt+space">Ctrl + Alt + Space</option>
            </select>
            <div className="help-text">Key to manually inject the script into the current page (useful in Conservative mode)</div>
          </div>

          <button
            onClick={() => {
              const defaultKeybinds = {
                trigger: 'ctrl+space',
                accept: 'arrowright',
                cycle: 'tab',
                dismiss: 'escape',
                rewrite: 'alt+shift+r',
                manualInject: 'ctrl+shift+space'
              };
              setSettings({ ...settings, keybinds: defaultKeybinds });
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="button-group">
        <button 
          className="btn-secondary"
          onClick={() => fetchModels()}
        >
          Refresh Models
        </button>
        <button 
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {status.type && (
        <div className={`status-message status-${status.type}`}>
          <span className={`status-icon ${status.type}`}></span>
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default Popup;