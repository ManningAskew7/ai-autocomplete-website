import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConsentScreen } from '../components/ConsentScreen';
import { markInstallDate } from '../utils/privacy';

const ConsentApp = () => {
  const handleConsentComplete = async (accepted: boolean) => {
    if (accepted) {
      // Mark installation date
      await markInstallDate();
      
      // Close this tab and open the extension popup for setup
      chrome.tabs.getCurrent((tab) => {
        if (tab?.id) {
          chrome.tabs.remove(tab.id);
        }
      });
      
      // Open popup for API key setup
      chrome.action.openPopup();
    } else {
      // User declined, extension will handle uninstall
      // The ConsentScreen component already handles this
    }
  };

  return <ConsentScreen onConsentComplete={handleConsentComplete} />;
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ConsentApp />
  </React.StrictMode>
);