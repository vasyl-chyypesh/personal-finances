import { Component, type ReactNode } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { Button } from '../components/ui/Button.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Localized fallback shown when a descendant throws during render. */
function ErrorFallback() {
  const { t } = useI18n();
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="mb-2 text-lg font-semibold text-slate-800">{t('error.title')}</h1>
      <p className="mb-5 text-sm text-slate-500">{t('error.body')}</p>
      <Button onClick={() => window.location.reload()}>{t('error.retry')}</Button>
    </div>
  );
}

/**
 * Top-level error boundary. Catches render-time errors anywhere below it and
 * shows a recoverable fallback instead of a blank screen. Must render inside the
 * i18n provider so the fallback can resolve strings.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
