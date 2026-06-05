import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Agentation } from 'agentation';
import AppContent from './components/AppContent';
import { ZoneProvider } from './contexts/ZoneContext';
import { PermissionProvider } from './contexts/PermissionContext';

const App: React.FC = () => {
  // Update document title based on app settings
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // Use websiteTitle if available, otherwise fallback to old format
      if (settings.websiteTitle) {
        document.title = settings.websiteTitle;
      } else {
        const systemName = settings.systemName || 'E-Logbook Maritime System';
        const headerTitle = settings.headerTitle || 'E-Logbook Maritime';
        document.title = `${headerTitle} - ${systemName}`;
      }
      
      // Update favicon if logo exists
      if (settings.systemLogo) {
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = settings.systemLogo;
        favicon.type = 'image/png';
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <ZoneProvider>
        <PermissionProvider>
          <AppContent />
          {process.env.NODE_ENV === 'development' && <Agentation />}
        </PermissionProvider>
      </ZoneProvider>
    </BrowserRouter>
  );
};

export default App;