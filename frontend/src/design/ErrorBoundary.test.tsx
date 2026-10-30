import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { ApiError } from '../lib/api/errors';

function Boom({ error }: { error: Error }): never {
  throw error;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary (17.5)', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>safe content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('shows a generic fallback for a plain thrown error, not the message or stack', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom error={new Error('exploded in render')} />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText('Something went wrong loading this.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('exploded in render')).not.toBeInTheDocument();
  });

  it('uses a custom fallbackMessage for non-API errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackMessage="This tile could not load.">
        <Boom error={new Error('boom')} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('This tile could not load.')).toBeInTheDocument();
  });

  it("shows an ApiError's own message and request ID instead of the fallback", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const apiError = new ApiError({
      status: 500,
      message: 'Database unavailable',
      requestId: 'req_789',
      path: '/work-orders',
    });

    render(
      <ErrorBoundary fallbackMessage="This tile could not load.">
        <Boom error={apiError} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
    expect(screen.getByText('Request ID: req_789')).toBeInTheDocument();
  });

  it('retries by re-rendering the same children, recovering once they stop throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    let attempt = 0;
    function ThrowsOnFirstRenderOnly() {
      attempt += 1;
      if (attempt === 1) {
        throw new Error('first render fails');
      }
      return <p>recovered content</p>;
    }

    render(
      <ErrorBoundary>
        <ThrowsOnFirstRenderOnly />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText('Something went wrong loading this.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(
      screen.queryByText('Something went wrong loading this.'),
    ).not.toBeInTheDocument();
  });
});
