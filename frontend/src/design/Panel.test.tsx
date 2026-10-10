import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('renders children on the deep (recessed) surface', () => {
    const { container } = render(<Panel>content</Panel>);
    const el = within(container).getByText('content');
    expect(el.className).toContain('bg-surface-deep');
    expect(el.className).toContain('rounded-card');
  });

  it('defaults to dense (36px) padding', () => {
    const { container } = render(<Panel>content</Panel>);
    expect(within(container).getByText('content').className).toContain('p-9');
  });

  it('applies recessed padding (120px vertical, 36px horizontal) for hero and empty states', () => {
    const { container } = render(<Panel padding="recessed">content</Panel>);
    const el = within(container).getByText('content');
    expect(el.className).toContain('py-30');
    expect(el.className).toContain('px-9');
  });

  it('applies no padding when padding="none"', () => {
    const { container } = render(<Panel padding="none">content</Panel>);
    const el = within(container).getByText('content');
    expect(el.className).not.toContain('p-9');
    expect(el.className).not.toContain('py-30');
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(
      <Panel className="custom-class">content</Panel>,
    );
    const el = within(container).getByText('content');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('bg-surface-deep');
  });
});
