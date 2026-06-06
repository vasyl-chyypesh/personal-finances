import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App.tsx';
import { ErrorBoundary } from './app/ErrorBoundary.tsx';
import { ThemeProvider } from './app/ThemeProvider.tsx';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
);
