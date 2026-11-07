import { test, expect, type Browser } from '@playwright/test';
import { claimAdminSlot } from './storage-state';

const ASSET_TAG = 'COMPRESSOR-01';
const DESCRIPTION = `e2e stale-state ${Date.now()}`;

async function newAdminPage(browser: Browser) {
  const context = await browser.newContext({
    storageState: claimAdminSlot(),
  });
  const page = await context.newPage();
  return { context, page };
}

test('a stale action against an already-cancelled work order reconciles instead of applying', async ({
  browser,
}) => {
  const a = await newAdminPage(browser);
  const b = await newAdminPage(browser);

  try {
    await a.page.goto('work-orders');
    await a.page.getByRole('button', { name: 'Create work order' }).click();
    const createDialog = a.page.getByRole('dialog');
    await createDialog.getByLabel('Asset').click();
    await createDialog.getByLabel('Asset').fill(ASSET_TAG);
    await createDialog.getByRole('option', { name: ASSET_TAG }).click();
    await createDialog
      .getByPlaceholder('Pump bearing making unusual noise')
      .fill(DESCRIPTION);
    await createDialog
      .getByRole('button', { name: 'Create work order' })
      .click();
    await expect(a.page).toHaveURL(/\/app\/work-orders\/[^/]+$/);

    const detailPath = new URL(a.page.url()).pathname.replace(/^\/app\//, '');

    await b.page.goto(detailPath);
    await expect(b.page.getByText('OPEN', { exact: true })).toBeVisible();
    await expect(
      b.page.getByRole('button', { name: 'Assign to me' }),
    ).toBeVisible();

    await a.page.getByRole('button', { name: 'Cancel work order' }).click();
    const cancelDialog = a.page.getByRole('dialog', {
      name: 'Cancel work order?',
    });
    await cancelDialog
      .getByRole('button', { name: 'Cancel work order' })
      .click();
    await expect(a.page.getByText('CANCELLED', { exact: true })).toBeVisible();

    await b.page.getByRole('button', { name: 'Assign to me' }).click();
    await expect(b.page.getByRole('alert')).toBeVisible();

    await expect(b.page.getByText('CANCELLED', { exact: true })).toBeVisible();
    await expect(
      b.page.getByRole('button', { name: 'Assign to me' }),
    ).toHaveCount(0);
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
