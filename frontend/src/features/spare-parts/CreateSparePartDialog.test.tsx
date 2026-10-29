import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { CreateSparePartDialog } from './CreateSparePartDialog';

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateSparePartDialog open onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe('CreateSparePartDialog', () => {
  it('has no axe violations when open (17.1)', async () => {
    const { container } = renderDialog();
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
