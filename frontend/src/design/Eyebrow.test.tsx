import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Eyebrow } from './Eyebrow';

describe('Eyebrow', () => {
  it('renders its children uppercase by default (label size, silver tone)', () => {
    const { container } = render(<Eyebrow>Plant Overview</Eyebrow>);
    const el = within(container).getByText('Plant Overview');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('text-label');
    expect(el.className).toContain('text-text-silver');
  });

  it('applies the eyebrow size', () => {
    const { container } = render(<Eyebrow size="eyebrow">Assets</Eyebrow>);
    const el = within(container).getByText('Assets');
    expect(el.className).toContain('text-eyebrow');
    expect(el.className).toContain('font-medium');
  });

  it('applies the mist tone', () => {
    const { container } = render(<Eyebrow tone="mist">Work Orders</Eyebrow>);
    expect(within(container).getByText('Work Orders').className).toContain(
      'text-text-mist',
    );
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(
      <Eyebrow className="custom-class">Telemetry</Eyebrow>,
    );
    const el = within(container).getByText('Telemetry');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('uppercase');
  });
});
