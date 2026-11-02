import { expect } from '@playwright/test';
import { test } from './fixtures';

const SKU = `E2E-${Date.now()}`;
const NAME = 'E2E test bearing';
const INITIAL_QUANTITY = 10;
const ADJUST_DELTA = 5;

test('adjusts a spare part and the table shows the server value', async ({
  adminPage: page,
}) => {
  await page.goto('spare-parts');
  await page.getByRole('button', { name: 'Add part' }).click();

  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('SKU').fill(SKU);
  await createDialog.getByLabel('Name').fill(NAME);
  await createDialog
    .getByLabel('Initial quantity')
    .fill(String(INITIAL_QUANTITY));
  await createDialog.getByLabel('Reorder threshold').fill('2');
  await createDialog.getByLabel('Unit cost').fill('5.00');
  await createDialog.getByRole('button', { name: 'Add part' }).click();

  const row = page.getByRole('row', { name: new RegExp(SKU) });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell').nth(2)).toHaveText(
    String(INITIAL_QUANTITY),
  );

  await row.getByRole('button', { name: 'Adjust' }).click();
  const adjustDialog = page.getByRole('dialog');
  await adjustDialog.getByLabel('Delta').fill(String(ADJUST_DELTA));
  await adjustDialog
    .getByLabel('Reason')
    .fill('e2e spare-parts spec: cycle count correction');
  await adjustDialog.getByRole('button', { name: 'Save adjustment' }).click();

  await expect(adjustDialog).toHaveCount(0);
  await expect(row.getByRole('cell').nth(2)).toHaveText(
    String(INITIAL_QUANTITY + ADJUST_DELTA),
  );
});
