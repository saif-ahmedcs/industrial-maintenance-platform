import { expect } from '@playwright/test';
import { test } from './fixtures';

const ASSET_TAG = 'MOTOR-01';
const ALERT_WAIT_MS = 120_000;

test('acknowledges a CRITICAL_ASSET alert and clears the unread badge', async ({
  adminPage: page,
}) => {
  test.setTimeout(200_000);

  const refreshResponse = await page.request.post('/auth/refresh');
  expect(refreshResponse.ok()).toBe(true);
  const { accessToken } = (await refreshResponse.json()) as {
    accessToken: string;
  };
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const assetsResponse = await page.request.get('/assets', {
    params: { limit: 100 },
    headers: authHeaders,
  });
  expect(assetsResponse.ok()).toBe(true);
  const assetsBody = (await assetsResponse.json()) as {
    data: { id: string; tag: string }[];
  };
  const asset = assetsBody.data.find((a) => a.tag === ASSET_TAG);
  if (!asset) throw new Error(`Seeded asset ${ASSET_TAG} not found`);

  const activeStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED'];
  for (const status of activeStatuses) {
    const workOrdersResponse = await page.request.get('/work-orders', {
      params: { assetId: asset.id, source: 'AUTO', status },
      headers: authHeaders,
    });
    expect(workOrdersResponse.ok()).toBe(true);
    const { data: workOrders } = (await workOrdersResponse.json()) as {
      data: { id: string }[];
    };
    for (const workOrder of workOrders) {
      const cancelResponse = await page.request.patch(
        `/work-orders/${workOrder.id}/cancel`,
        { headers: authHeaders },
      );
      expect(cancelResponse.ok()).toBe(true);
    }
  }

  await page.goto('alerts');

  const alertCard = page.locator('.rounded-card', {
    hasText: `Asset ${ASSET_TAG} is CRITICAL`,
  });
  await expect(alertCard).toBeVisible({ timeout: ALERT_WAIT_MS });
  await expect(
    alertCard.getByRole('button', { name: 'Acknowledge' }),
  ).toBeVisible();

  const badge = page.getByRole('link', { name: /Alerts/ }).locator('span');
  const badgeCountBefore = await badge.textContent();

  await alertCard.getByRole('button', { name: 'Acknowledge' }).click();

  await expect(
    alertCard.getByRole('button', { name: 'Acknowledge' }),
  ).toHaveCount(0);
  await expect.poll(() => badge.textContent()).not.toBe(badgeCountBefore);
});
