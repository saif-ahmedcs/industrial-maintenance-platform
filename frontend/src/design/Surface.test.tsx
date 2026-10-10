import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Surface } from './Surface';

describe('Surface', () => {
  it('renders children inside a div by default', () => {
    const { container } = render(<Surface>content</Surface>);
    expect(within(container).getByText('content').tagName).toBe('DIV');
  });

  it('renders as a different element when "as" is given', () => {
    const { container } = render(<Surface as="section">content</Surface>);
    expect(within(container).getByText('content').tagName).toBe('SECTION');
  });

  it('defaults to the kelp tone, card padding, and card radius', () => {
    const { container } = render(<Surface>content</Surface>);
    const el = within(container).getByText('content');
    expect(el.className).toContain('bg-surface-kelp');
    expect(el.className).toContain('p-9');
    expect(el.className).toContain('rounded-card');
  });

  it('applies the deep tone', () => {
    const { container } = render(<Surface tone="deep">content</Surface>);
    expect(within(container).getByText('content').className).toContain(
      'bg-surface-deep',
    );
  });

  it('applies card-lg padding', () => {
    const { container } = render(<Surface padding="card-lg">content</Surface>);
    expect(within(container).getByText('content').className).toContain('p-12');
  });

  it('applies no padding when padding="none"', () => {
    const { container } = render(<Surface padding="none">content</Surface>);
    const el = within(container).getByText('content');
    expect(el.className).not.toContain('p-9');
    expect(el.className).not.toContain('p-12');
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(
      <Surface className="custom-class">content</Surface>,
    );
    const el = within(container).getByText('content');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('bg-surface-kelp');
  });

  it('forwards extra DOM props to the underlying element', () => {
    const { container } = render(
      <Surface data-testid="surface-el">content</Surface>,
    );
    expect(within(container).getByTestId('surface-el')).toBeInTheDocument();
  });
});
