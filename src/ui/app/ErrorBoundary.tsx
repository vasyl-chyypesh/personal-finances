import { Component, type ReactNode } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { AlertIcon } from '../components/icons.tsx';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** When true, render a compact in-page fallback (page-level boundary). */
  inline?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Localized fallback. `onRetry` resets the boundary so children re-mount and
 * re-run their data fetches — recoverable without a full page reload. */
function ErrorFallback({ onRetry, inline }: { onRetry: () => void; inline?: boolean }) {
  const { t } = useI18n();
  const retry = <Button onClick={onRetry}>{t('error.retry')}</Button>;

  if (inline) {
    return (
      <EmptyState
        icon={<AlertIcon size={22} />}
        title={t('error.title')}
        description={t('error.body')}
        action={retry}
      />
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border-hairline border-line bg-surface p-8 text-center">
      <h1 className="mb-2 text-lg font-medium text-fg">{t('error.title')}</h1>
      <p className="mb-5 text-sm text-fg-muted">{t('error.body')}</p>
      {retry}
    </div>
  );
}

/**
 * Catches render-time errors in its subtree and shows a recoverable fallback
 * instead of a blank screen. Used both at the app root and per page (`inline`).
 * Retrying clears the error state, re-mounting children. Must render inside the
 * i18n provider so the fallback can resolve strings.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private retry = () => this.setState({ hasError: false });

  render(): ReactNode {
    return this.state.hasError ? (
      <ErrorFallback onRetry={this.retry} inline={this.props.inline} />
    ) : (
      this.props.children
    );
  }
}
