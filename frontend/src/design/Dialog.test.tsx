import { fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Dialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Dialog open={false} title="Confirm" onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title, body, and a role="dialog" with aria-modal when open', () => {
    const { container } = render(
      <Dialog open title="Delete spare part" onClose={() => {}}>
        <p>This cannot be undone.</p>
      </Dialog>,
    );
    const dialog = within(container).getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Delete spare part');
    expect(
      within(container).getByRole('heading', { name: 'Delete spare part' }),
    ).toBeInTheDocument();
    expect(
      within(container).getByText('This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it('always renders a labelled close button', () => {
    const { container } = render(
      <Dialog open title="Confirm" onClose={() => {}} />,
    );
    expect(
      within(container).getByRole('button', { name: 'Close' }),
    ).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open title="Confirm" onClose={onClose} />,
    );
    within(container).getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open title="Confirm" onClose={onClose} />,
    );
    fireEvent.keyDown(within(container).getByRole('dialog'), {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open title="Confirm" onClose={onClose} />,
    );
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the footer when given', () => {
    const { container } = render(
      <Dialog
        open
        title="Confirm"
        onClose={() => {}}
        footer={<button type="button">Delete</button>}
      >
        Body
      </Dialog>,
    );
    expect(
      within(container).getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });

  it('moves focus to the first focusable element when it opens', () => {
    const { container } = render(
      <Dialog open title="Confirm" onClose={() => {}} />,
    );
    expect(document.activeElement).toBe(
      within(container).getByRole('button', { name: 'Close' }),
    );
  });

  it('returns focus to the previously focused element when it closes', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open dialog';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <Dialog open title="Confirm" onClose={() => {}} />,
    );
    expect(document.activeElement).not.toBe(trigger);

    rerender(<Dialog open={false} title="Confirm" onClose={() => {}} />);
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus: wraps from the last focusable element to the first', () => {
    const { container } = render(
      <Dialog
        open
        title="Confirm"
        onClose={() => {}}
        footer={<button type="button">Delete</button>}
      />,
    );
    const close = within(container).getByRole('button', { name: 'Close' });
    const deleteButton = within(container).getByRole('button', {
      name: 'Delete',
    });
    deleteButton.focus();
    fireEvent.keyDown(within(container).getByRole('dialog'), {
      key: 'Tab',
    });
    expect(document.activeElement).toBe(close);
  });

  it('traps Shift+Tab focus: wraps from the first focusable element to the last', () => {
    const { container } = render(
      <Dialog
        open
        title="Confirm"
        onClose={() => {}}
        footer={<button type="button">Delete</button>}
      />,
    );
    const close = within(container).getByRole('button', { name: 'Close' });
    const deleteButton = within(container).getByRole('button', {
      name: 'Delete',
    });
    close.focus();
    fireEvent.keyDown(within(container).getByRole('dialog'), {
      key: 'Tab',
      shiftKey: true,
    });
    expect(document.activeElement).toBe(deleteButton);
  });

  it('merges a custom className onto the panel', () => {
    const { container } = render(
      <Dialog
        open
        title="Confirm"
        onClose={() => {}}
        className="custom-class"
      />,
    );
    const dialog = within(container).getByRole('dialog');
    expect(dialog.className).toContain('custom-class');
  });
});
