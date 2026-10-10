import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children as the accessible name', () => {
    const { container } = render(<Button>Save plan</Button>);
    const el = within(container).getByRole('button', { name: 'Save plan' });
    expect(el).toBeInTheDocument();
  });

  it('defaults to a native button of type="button"', () => {
    const { container } = render(<Button>Save plan</Button>);
    expect(within(container).getByRole('button')).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('defaults to the primary variant: gradient fill, dark ink label, uppercase, 6px radius', () => {
    const { container } = render(<Button>Create work order</Button>);
    const el = within(container).getByRole('button');
    expect(el.className).toContain('bg-gradient-bioluminescent');
    expect(el.className).toContain('text-text-ink');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('rounded-small');
    expect(el.className).toContain('font-ui');
    expect(el.className).toContain('text-ui');
  });

  it('applies the ghost variant: transparent with a slate border and silver label', () => {
    const { container } = render(<Button variant="ghost">Cancel</Button>);
    const el = within(container).getByRole('button');
    expect(el.className).toContain('border-surface-slate');
    expect(el.className).toContain('text-text-silver');
    expect(el.className).not.toContain('bg-gradient-bioluminescent');
  });

  it('applies the spec padding (32px vertical, 22px horizontal)', () => {
    const { container } = render(<Button>Assign</Button>);
    const el = within(container).getByRole('button');
    expect(el.className).toContain('py-8');
    expect(el.className).toContain('px-[22px]');
  });

  it('is disabled when disabled is passed, and dims via opacity', () => {
    const { container } = render(<Button disabled>Save plan</Button>);
    const el = within(container).getByRole('button');
    expect(el).toBeDisabled();
    expect(el.className).toContain('disabled:opacity-50');
  });

  it('shows a decorative spinner and marks aria-busy when loading, and disables the button', () => {
    const { container } = render(<Button loading>Save plan</Button>);
    const el = within(container).getByRole('button');
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute('aria-busy', 'true');
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('is not marked aria-busy when not loading', () => {
    const { container } = render(<Button>Save plan</Button>);
    expect(within(container).getByRole('button')).not.toHaveAttribute(
      'aria-busy',
    );
  });

  it('forwards onClick and other native button props', () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Save plan</Button>);
    within(container).getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(
      <Button className="custom-class">Save plan</Button>,
    );
    const el = within(container).getByRole('button');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('bg-gradient-bioluminescent');
  });

  it('respects an explicit type override', () => {
    const { container } = render(<Button type="submit">Save plan</Button>);
    expect(within(container).getByRole('button')).toHaveAttribute(
      'type',
      'submit',
    );
  });
});
