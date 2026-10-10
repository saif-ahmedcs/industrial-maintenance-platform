import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders a plain string error as the message', () => {
    const { container } = render(<ErrorState error="Something went wrong." />);
    expect(
      within(container).getByText('Something went wrong.'),
    ).toBeInTheDocument();
  });

  it("renders an error object's message", () => {
    const { container } = render(
      <ErrorState error={{ message: 'You do not have permission to do this.' }} />,
    );
    expect(
      within(container).getByText('You do not have permission to do this.'),
    ).toBeInTheDocument();
  });

  it('renders the request ID when present on an error object', () => {
    const { container } = render(
      <ErrorState
        error={{ message: 'Something went wrong on our side.', requestId: 'req_123' }}
      />,
    );
    expect(within(container).getByText('Request ID: req_123')).toBeInTheDocument();
  });

  it('renders no request ID line for a string error', () => {
    const { container } = render(<ErrorState error="Something went wrong." />);
    expect(container.textContent).not.toContain('Request ID');
  });

  it('renders no request ID line when the error object omits it', () => {
    const { container } = render(
      <ErrorState error={{ message: 'Something went wrong.' }} />,
    );
    expect(container.textContent).not.toContain('Request ID');
  });

  it('renders a Retry button and calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ErrorState error="Something went wrong." onRetry={onRetry} />,
    );
    within(container).getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no Retry button when onRetry is omitted', () => {
    const { container } = render(<ErrorState error="Something went wrong." />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('is announced to assistive tech via role="alert"', () => {
    const { container } = render(<ErrorState error="Something went wrong." />);
    expect(within(container).getByRole('alert')).toBeInTheDocument();
  });

  it('merges a custom className', () => {
    const { container } = render(
      <ErrorState error="Something went wrong." className="custom-class" />,
    );
    expect(within(container).getByRole('alert').className).toContain(
      'custom-class',
    );
  });
});
