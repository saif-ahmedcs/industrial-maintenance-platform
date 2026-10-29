import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { RestockSparePartDialog } from './RestockSparePartDialog';
import type { SparePart } from './api';

const PART: SparePart = {
  id: 'part-1',
  sku: 'SKU-1',
  name: 'Bearing',
  quantityOnHand: 10,
  reorderThreshold: 5,
  unitCost: 12.5,
  isLowStock: false,
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RestockSparePartDialog open onClose={() => {}} part={PART} />
    </QueryClientProvider>,
  );
}

describe('RestockSparePartDialog', () => {
  it('has no axe violations when open (17.1)', async () => {
    const { container } = renderDialog();
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
