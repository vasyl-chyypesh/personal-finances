import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './AppLayout.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { LedgerPage } from '../pages/LedgerPage.tsx';
import { CategoriesPage } from '../pages/CategoriesPage.tsx';
import { CurrenciesPage } from '../pages/CurrenciesPage.tsx';
import { ChatPage } from '../pages/ChatPage.tsx';
import type { ReactNode } from 'react';

/** Page-level boundary: an error in one page shows a recoverable state, not a
 * blank app. Each route gets its own so navigating away clears the error. */
function Page({ children }: { children: ReactNode }) {
  return <ErrorBoundary inline>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/ledger" replace />} />
        <Route
          path="/ledger"
          element={
            <Page>
              <LedgerPage />
            </Page>
          }
        />
        <Route
          path="/categories"
          element={
            <Page>
              <CategoriesPage />
            </Page>
          }
        />
        <Route
          path="/currencies"
          element={
            <Page>
              <CurrenciesPage />
            </Page>
          }
        />
        <Route
          path="/chat"
          element={
            <Page>
              <ChatPage />
            </Page>
          }
        />
        <Route path="*" element={<Navigate to="/ledger" replace />} />
      </Route>
    </Routes>
  );
}
