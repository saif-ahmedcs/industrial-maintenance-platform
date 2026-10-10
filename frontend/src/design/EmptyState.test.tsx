import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title as a level-2 heading', () => {
    const { container } = render(
      <EmptyState
        title="Nothing is overdue"
        body="All plans are on schedule."
      />,
    );
    const heading = within(container).getByRole('heading', {
      level: 2,
      name: 'Nothing is overdue',
    });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('text-heading-lg');
  });

  it('renders the body text', () => {
    const { container } = render(
      <EmptyState
        title="No open work orders"
        body="Create one from an asset page."
      />,
    );
    expect(
      within(container).getByText('Create one from an asset page.'),
    ).toBeInTheDocument();
  });

  it('renders the action when provided', () => {
    const { container } = render(
      <EmptyState
        title="No open work orders"
        body="Create one from an asset page."
        action={<button type="button">Create work order</button>}
      />,
    );
    expect(
      within(container).getByRole('button', { name: 'Create work order' }),
    ).toBeInTheDocument();
  });

  it('renders no action wrapper when action is omitted', () => {
    const { container } = render(
      <EmptyState
        title="No open work orders"
        body="Create one from an asset page."
      />,
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('uses the recessed (sunken well) Panel treatment', () => {
    const { container } = render(
      <EmptyState
        title="Nothing is overdue"
        body="All plans are on schedule."
      />,
    );
    const panel = container.firstElementChild;
    expect(panel?.className).toContain('bg-surface-deep');
    expect(panel?.className).toContain('py-30');
  });

  it('merges a custom className', () => {
    const { container } = render(
      <EmptyState
        title="Nothing is overdue"
        body="All plans are on schedule."
        className="custom-class"
      />,
    );
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});
