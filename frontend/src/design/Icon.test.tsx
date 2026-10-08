import { render } from '@testing-library/react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';

describe('Icon', () => {
  it('is decorative (aria-hidden, no accessible name) when no label is given', () => {
    const { container } = render(<Icon icon={IconAlertTriangle} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('exposes role="img" and the label when one is given', () => {
    const { container } = render(
      <Icon icon={IconAlertTriangle} label="Warning" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Warning');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('throws in development when it is the only content of a button with no accessible name', () => {
    expect(() =>
      render(
        <button type="button">
          <Icon icon={IconAlertTriangle} />
        </button>,
      ),
    ).toThrow(/no accessible name/);
  });

  it('does not throw inside a button when a label is given', () => {
    expect(() =>
      render(
        <button type="button">
          <Icon icon={IconAlertTriangle} label="Delete" />
        </button>,
      ),
    ).not.toThrow();
  });

  it('does not throw inside a button that already has its own aria-label', () => {
    expect(() =>
      render(
        <button type="button" aria-label="Dismiss">
          <Icon icon={IconAlertTriangle} />
        </button>,
      ),
    ).not.toThrow();
  });

  it('does not throw inside a button that has other visible text', () => {
    expect(() =>
      render(
        <button type="button">
          <Icon icon={IconAlertTriangle} />
          Dismiss
        </button>,
      ),
    ).not.toThrow();
  });

  it('does not throw when not inside a button at all', () => {
    expect(() => render(<Icon icon={IconAlertTriangle} />)).not.toThrow();
  });
});
