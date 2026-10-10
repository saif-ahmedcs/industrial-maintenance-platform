import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('uses the label prop as the accessible name', () => {
    const { container } = render(<IconButton label="Open PUMP-01" />);
    expect(
      within(container).getByRole('button', { name: 'Open PUMP-01' }),
    ).toBeInTheDocument();
  });

  it('renders the icon as decorative, since the button already has an accessible name', () => {
    const { container } = render(<IconButton label="Open PUMP-01" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('does not throw without an explicit icon, since "open" is the default', () => {
    expect(() => render(<IconButton label="Open PUMP-01" />)).not.toThrow();
  });

  it('renders the close variant when icon="close" is given', () => {
    const { container } = render(<IconButton label="Close" icon="close" />);
    expect(
      within(container).getByRole('button', { name: 'Close' }),
    ).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('defaults to a native button of type="button"', () => {
    const { container } = render(<IconButton label="Open PUMP-01" />);
    expect(within(container).getByRole('button')).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('is a 32px square with a 6px radius and the arrow-button fill', () => {
    const { container } = render(<IconButton label="Open PUMP-01" />);
    const el = within(container).getByRole('button');
    expect(el.className).toContain('size-8');
    expect(el.className).toContain('rounded-small');
    expect(el.className).toContain('bg-surface-arrow-button');
    expect(el.className).toContain('text-text-platinum');
  });

  it('is disabled when disabled is passed, and dims via opacity', () => {
    const { container } = render(<IconButton label="Open PUMP-01" disabled />);
    const el = within(container).getByRole('button');
    expect(el).toBeDisabled();
    expect(el.className).toContain('disabled:opacity-50');
  });

  it('forwards onClick and other native button props', () => {
    const onClick = vi.fn();
    const { container } = render(
      <IconButton label="Open PUMP-01" onClick={onClick} />,
    );
    within(container).getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(
      <IconButton label="Open PUMP-01" className="custom-class" />,
    );
    const el = within(container).getByRole('button');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('bg-surface-arrow-button');
  });

  it('respects an explicit type override', () => {
    const { container } = render(
      <IconButton label="Open PUMP-01" type="submit" />,
    );
    expect(within(container).getByRole('button')).toHaveAttribute(
      'type',
      'submit',
    );
  });
});
