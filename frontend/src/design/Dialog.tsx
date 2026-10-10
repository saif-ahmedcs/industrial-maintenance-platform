import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Surface } from './Surface';
import { Heading } from './Heading';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// Elements the focus trap treats as tab stops: native interactive
// controls, plus anything explicitly opted in via tabindex.
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Move focus into the dialog on open, and give it back to whatever
  // triggered it on close — the dialog never leaves the user's keyboard
  // position stranded.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panel)?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-surface-abyss/80"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={['relative', 'w-full', 'max-w-[480px]', className]
          .filter(Boolean)
          .join(' ')}
      >
        <Surface tone="kelp" padding="card" className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <Heading level={2} scale="heading">
              {title}
            </Heading>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </div>
          {children}
          {footer && (
            <div className="flex items-center justify-end gap-3">{footer}</div>
          )}
        </Surface>
      </div>
    </div>
  );
}
