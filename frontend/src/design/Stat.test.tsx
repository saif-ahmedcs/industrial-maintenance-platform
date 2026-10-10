import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stat } from './Stat';

describe('Stat', () => {
  it('renders the value and label', () => {
    const { container } = render(<Stat value={4} label="Open work orders" />);
    const scope = within(container);
    expect(scope.getByText('4')).toBeInTheDocument();
    expect(scope.getByText('Open work orders')).toBeInTheDocument();
  });

  it('renders a value of 0 in the normal style, not as a loading placeholder', () => {
    const { container } = render(<Stat value={0} label="Critical assets" />);
    const scope = within(container);
    const valueEl = scope.getByText('0');
    expect(valueEl.className).toContain('text-accent-lavender');
    expect(
      scope.queryByText('Loading Critical assets'),
    ).not.toBeInTheDocument();
  });

  it('shows a loading placeholder instead of the value when loading', () => {
    const { container } = render(
      <Stat value={4} loading label="Overdue plans" />,
    );
    const scope = within(container);
    expect(scope.queryByText('4')).not.toBeInTheDocument();
    expect(scope.getByText('Loading Overdue plans')).toBeInTheDocument();
  });

  it('applies the accent-lavender color to the value', () => {
    const { container } = render(<Stat value={12} label="Low-stock parts" />);
    expect(within(container).getByText('12').className).toContain(
      'text-accent-lavender',
    );
  });

  it('defaults the label tone to mist', () => {
    const { container } = render(<Stat value={3} label="Readings last hour" />);
    expect(
      within(container).getByText('Readings last hour').className,
    ).toContain('text-text-mist');
  });

  it('applies the silver label tone', () => {
    const { container } = render(
      <Stat value={3} label="Readings last hour" tone="silver" />,
    );
    expect(
      within(container).getByText('Readings last hour').className,
    ).toContain('text-text-silver');
  });
});
