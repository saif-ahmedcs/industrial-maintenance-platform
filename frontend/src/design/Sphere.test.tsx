import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sphere } from './Sphere';

describe('Sphere', () => {
  it('renders at the default 240px size', () => {
    const { container } = render(<Sphere />);
    const el = within(container).getByTestId('sphere-placeholder');
    expect(el.style.width).toBe('240px');
    expect(el.style.height).toBe('240px');
  });

  it('renders at a custom size', () => {
    const { container } = render(<Sphere size={96} />);
    const el = within(container).getByTestId('sphere-placeholder');
    expect(el.style.width).toBe('96px');
    expect(el.style.height).toBe('96px');
  });

  it('is decorative: hidden from assistive tech and never captures pointer input', () => {
    const { container } = render(<Sphere />);
    const el = within(container).getByTestId('sphere-placeholder');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toContain('pointer-events-none');
  });

  it('animates by default', () => {
    const { container } = render(<Sphere />);
    expect(
      within(container).getByTestId('sphere-placeholder').className,
    ).toContain('animate-pulse');
  });

  it('does not animate when animated is false', () => {
    const { container } = render(<Sphere animated={false} />);
    expect(
      within(container).getByTestId('sphere-placeholder').className,
    ).not.toContain('animate-pulse');
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(<Sphere className="custom-class" />);
    const el = within(container).getByTestId('sphere-placeholder');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('rounded-full');
  });
});
