import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ApiError } from '../lib/api/errors';
import { ErrorState, type ErrorStateError } from './ErrorState';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toErrorStateError(
  error: Error,
  fallbackMessage: string,
): ErrorStateError {
  if (error instanceof ApiError) {
    return { message: error.message, requestId: error.requestId };
  }
  return { message: fallbackMessage };
}

const DEFAULT_FALLBACK_MESSAGE = 'Something went wrong loading this.';

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { fallbackMessage = DEFAULT_FALLBACK_MESSAGE, className } =
      this.props;

    if (error) {
      return (
        <ErrorState
          error={toErrorStateError(error, fallbackMessage)}
          onRetry={this.reset}
          className={className}
        />
      );
    }

    return this.props.children;
  }
}
