import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server';
import { CreatePlanDialog } from './CreatePlanDialog';

const ASSET_OPTIONS = [{ value: 'asset-1', label: 'Pump A' }];

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreatePlanDialog open onClose={() => {}} assetOptions={ASSET_OPTIONS} />
    </QueryClientProvider>,
  );
}

async function fillValidAssetAndName(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText('Asset'));
  await user.click(screen.getByRole('option', { name: 'Pump A' }));
  await user.type(screen.getByLabelText('Name'), 'Quarterly lubrication');
}

describe('CreatePlanDialog', () => {
  it('rejects a non-integer interval with the same message the backend returns, without calling the API', async () => {
    const user = userEvent.setup();
    let createCalls = 0;
    server.use(
      http.post('/maintenance-plans', () => {
        createCalls += 1;
        return HttpResponse.json({ message: 'should not be called' });
      }),
    );

    renderDialog();
    await fillValidAssetAndName(user);
    await user.type(screen.getByLabelText('Interval (days)'), '12.5');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));

    expect(
      await screen.findByText('must be an integer number'),
    ).toBeInTheDocument();
    expect(createCalls).toBe(0);
  });

  it('rejects an interval below 1 and above 3650 with the backend wording', async () => {
    const user = userEvent.setup();
    renderDialog();
    await fillValidAssetAndName(user);

    await user.type(screen.getByLabelText('Interval (days)'), '0');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(
      await screen.findByText('must not be less than 1'),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Interval (days)'));
    await user.type(screen.getByLabelText('Interval (days)'), '3651');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(
      await screen.findByText('must be less than or equal to 3650'),
    ).toBeInTheDocument();
  });
});
