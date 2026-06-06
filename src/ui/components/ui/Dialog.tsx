import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogProps {
  /** Heading shown in the dialog and wired to `aria-labelledby`. */
  title: ReactNode;
  /** Accessible label + visible text for the close affordance. */
  closeLabel: string;
  /** Called on Escape, backdrop click, or close button. */
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapTab(event: KeyboardEvent, container: HTMLElement | null): void {
  if (!container) {
    return;
  }
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) {
    return;
  }
  const first = items[0];
  const last = items.at(-1) ?? first;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Accessible modal dialog: `role="dialog"` + `aria-modal`, Escape to close,
 * Tab focus trap, and focus restoration to the previously focused element on
 * unmount. Clicking the backdrop closes; clicks inside the panel do not.
 */
export function Dialog({ title, closeLabel, onClose, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Keep the latest onClose in a ref so the open/close effect runs exactly once
  // per mount. Depending on `onClose` directly would re-run the effect whenever
  // the parent passes a fresh handler (e.g. an inline arrow), stealing focus
  // back to the close button mid-interaction and clobbering focus restoration.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        trapTab(event, panelRef.current);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mt-10 w-full max-w-lg rounded-lg border border-line bg-surface p-5 text-fg shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-md px-2 py-1 text-sm text-fg-subtle transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
