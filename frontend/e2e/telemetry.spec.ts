import { expect } from '@playwright/test';
import { test } from './fixtures';

const ASSET_TAG = 'MOTOR-01';

const BUDGET_PER_MINUTE = 14;
const WINDOW_MS = 60_000;

test('shows live readings for MOTOR-01 within the telemetry request budget', async ({
  adminPage: page,
}) => {
  await page.goto('telemetry');
  await page.getByLabel('Asset').click();
  await page.getByLabel('Asset').fill(ASSET_TAG);
  await page.getByRole('option', { name: ASSET_TAG }).click();

  await expect(page.getByText('Temperature')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('—', { exact: true })).toHaveCount(0);

  let telemetryRequestCount = 0;
  const onRequest = (request: { url: () => string }) => {
    if (/\/assets\/[^/]+\/telemetry(\/latest)?(\?|$)/.test(request.url())) {
      telemetryRequestCount += 1;
    }
  };
  page.on('request', onRequest);

  await page.waitForTimeout(WINDOW_MS);
  page.off('request', onRequest);

  expect(telemetryRequestCount).toBeLessThanOrEqual(BUDGET_PER_MINUTE);
});
