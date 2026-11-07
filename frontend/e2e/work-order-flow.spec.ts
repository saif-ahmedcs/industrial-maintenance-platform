import { expect } from '@playwright/test';
import { test } from './fixtures';

const ASSET_TAG = 'PUMP-01';
const DESCRIPTION = `e2e work-order-flow ${Date.now()}`;

test('create, assign, start, complete a work order, then verify the audit trail', async ({
  adminPage: page,
}) => {
  await page.goto('work-orders');
  await page.getByRole('button', { name: 'Create work order' }).click();

  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Asset').click();
  await createDialog.getByLabel('Asset').fill(ASSET_TAG);
  await createDialog.getByRole('option', { name: ASSET_TAG }).click();
  await createDialog
    .getByPlaceholder('Pump bearing making unusual noise')
    .fill(DESCRIPTION);
  await createDialog.getByLabel('Priority').selectOption('HIGH');
  await createDialog.getByRole('button', { name: 'Create work order' }).click();

  await expect(page).toHaveURL(/\/app\/work-orders\/[^/]+$/);
  await expect(page.getByText('Work order created.')).toBeVisible();
  await expect(page.getByText('OPEN', { exact: true })).toBeVisible();

  const workOrderUrl = page.url();
  const workOrderId = workOrderUrl.split('/').pop() as string;
  const shortRef = `#${workOrderId.slice(0, 8).toUpperCase()}`;

  await page.getByRole('button', { name: 'Assign to me' }).click();
  await expect(page.getByText('ASSIGNED', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByText('IN PROGRESS', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Complete' }).click();
  await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(0);

  await page.goto('audit');
  await page.getByLabel('Entity type').selectOption('WorkOrder');

  for (const action of ['Create', 'Assign', 'Start', 'Complete']) {
    await expect(
      page.locator('tr', { hasText: shortRef }).filter({ hasText: action }),
    ).toHaveCount(1);
  }
});
