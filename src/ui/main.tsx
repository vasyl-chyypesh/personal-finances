import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App.tsx';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
