import React, { useState } from 'react';
import { saveConsent, getPrivacyPolicyUrl, getTermsOfServiceUrl } from '../utils/privacy';
import './ConsentScreen.css';

interface ConsentScreenProps {
  onConsentComplete: (accepted: boolean) => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onConsentComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await saveConsent(true);
      onConsentComplete(true);
    } catch (error) {
      console.error('Error saving consent:', error);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await saveConsent(false);
      onConsentComplete(false);
      // Extension will handle uninstall
      window.close();
    } catch (error) {
      console.error('Error declining consent:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="consent-screen">
      <div className="consent-container">
        <div className="consent-header">
          <div className="consent-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" stroke="#ffffff" strokeWidth="2"/>
              <path d="M20 32L28 40L44 24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>Welcome to AI Autocomplete</h1>
          <p className="subtitle">Smart Text Predictions for Every Website</p>
        </div>

        <div className="consent-content">
          <div className="consent-section">
            <h2>How It Works</h2>
            <p>
              AI Autocomplete enhances your typing experience with intelligent text suggestions powered by advanced AI models.
              Simply press <span className="key">Ctrl+Space</span> to get smart completions anywhere you type.
            </p>
          </div>

          <div className="consent-section">
            <h2>Your Privacy Matters</h2>
            <div className="privacy-points">
              <div className="privacy-point">
                <div className="privacy-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4 7V11C4 15.55 6.84 19.74 11 21C15.16 19.74 20 15.55 20 11V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <strong>You Control When It Activates</strong>
                  <p>Text is only processed when you explicitly trigger it with Ctrl+Space</p>
                </div>
              </div>
              <div className="privacy-point">
                <div className="privacy-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="13" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <strong>No Permanent Storage</strong>
                  <p>Your text is processed in real-time and never stored permanently</p>
                </div>
              </div>
              <div className="privacy-point">
                <div className="privacy-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <strong>Secure Processing</strong>
                  <p>All data is encrypted and processed securely via OpenRouter API</p>
                </div>
              </div>
            </div>
          </div>

          <div className="consent-section">
            <button 
              className="details-toggle"
              onClick={() => setShowDetails(!showDetails)}
              type="button"
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ transform: showDetails ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              What Information We Process
            </button>
            
            {showDetails && (
              <div className="details-content">
                <ul>
                  <li>
                    <strong>Text Context:</strong> The text you're typing (only when you press Ctrl+Space)
                  </li>
                  <li>
                    <strong>Selected Text:</strong> Any highlighted text for better context
                  </li>
                  <li>
                    <strong>Page URL:</strong> The current website to provide relevant suggestions
                  </li>
                  <li>
                    <strong>Usage Statistics:</strong> Anonymous data to improve the extension (optional)
                  </li>
                </ul>
                <p className="note">
                  Password fields and payment forms are automatically excluded for your security.
                </p>
              </div>
            )}
          </div>

          <div className="consent-links">
            <a 
              href={getPrivacyPolicyUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="policy-link"
            >
              Privacy Policy
            </a>
            <span className="separator">•</span>
            <a 
              href={getTermsOfServiceUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="policy-link"
            >
              Terms of Service
            </a>
          </div>

          <div className="consent-actions">
            <button 
              className="btn-decline"
              onClick={handleDecline}
              disabled={isProcessing}
            >
              Decline and Uninstall
            </button>
            <button 
              className="btn-accept"
              onClick={handleAccept}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Accept and Continue'}
            </button>
          </div>

          <p className="consent-footer">
            By clicking "Accept and Continue", you agree to our Privacy Policy and Terms of Service.
            You can change your privacy settings at any time from the extension popup.
          </p>
        </div>
      </div>
    </div>
  );
};