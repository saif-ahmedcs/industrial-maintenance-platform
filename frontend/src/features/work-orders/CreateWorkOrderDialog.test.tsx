import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';

const ASSET_OPTIONS = [{ value: 'asset-1', label: 'PUMP-01' }];

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateWorkOrderDialog
          open
          onClose={() => {}}
          assetOptions={ASSET_OPTIONS}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CreateWorkOrderDialog', () => {
  it('has no axe violations when open (17.1)', async () => {
    const { container } = renderDialog();
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
