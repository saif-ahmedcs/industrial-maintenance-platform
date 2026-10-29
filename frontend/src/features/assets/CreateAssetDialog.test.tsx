import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { CreateAssetDialog } from './CreateAssetDialog';

const ASSET_TYPE_OPTIONS = [{ value: 'type-1', label: 'Pump' }];
const LOCATION_OPTIONS = [{ value: 'location-1', label: 'Building A' }];

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateAssetDialog
        open
        onClose={() => {}}
        assetTypeOptions={ASSET_TYPE_OPTIONS}
        locationOptions={LOCATION_OPTIONS}
      />
    </QueryClientProvider>,
  );
}

describe('CreateAssetDialog', () => {
  it('has no axe violations when open (17.1)', async () => {
    const { container } = renderDialog();
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
