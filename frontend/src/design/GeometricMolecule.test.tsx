import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GeometricMolecule } from './GeometricMolecule';

describe('GeometricMolecule', () => {
  it('is decorative: hidden from assistive tech', () => {
    const { container } = render(<GeometricMolecule />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders circles joined by connector lines, with no fill complexity', () => {
    const { container } = render(<GeometricMolecule />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('line').length).toBeGreaterThan(0);
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(
      <GeometricMolecule className="custom-class" />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('custom-class');
    expect(svg?.getAttribute('class')).toContain('text-text-silver');
  });
});
