import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { EditPlanDialog } from './EditPlanDialog';
import type { MaintenancePlan } from './api';

const PLAN: MaintenancePlan = {
  id: 'plan-1',
  assetId: 'asset-1',
  name: 'Quarterly lubrication',
  intervalDays: 90,
  lastCompletedAt: null,
  nextDueAt: '2026-12-01T00:00:00.000Z',
  active: true,
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditPlanDialog open onClose={() => {}} plan={PLAN} />
    </QueryClientProvider>,
  );
}

describe('EditPlanDialog', () => {
  it('has no axe violations when open (17.1)', async () => {
    const { container } = renderDialog();
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
