import { expect, type Page, test } from '@playwright/test';
import { loginAs, loginAsAdmin } from './fixtures';
import {
  SUPERVISOR_EMAIL,
  SUPERVISOR_PASSWORD,
  TECHNICIAN_EMAIL,
  TECHNICIAN_PASSWORD,
} from './env';

const ASSET_TAG = 'PUMP-02';

async function createWorkOrder(
  page: Page,
  assetTag: string,
  description: string,
): Promise<void> {
  await page.goto('work-orders');
  await page.getByRole('button', { name: 'Create work order' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').click();
  await dialog.getByRole('combobox').fill(assetTag);
  await dialog.getByRole('option', { name: assetTag }).click();
  await dialog
    .getByPlaceholder('Pump bearing making unusual noise')
    .fill(description);
  await dialog.getByRole('button', { name: 'Create work order' }).click();
  await expect(page).toHaveURL(/\/app\/work-orders\/[^/]+$/);
}

test.describe('roles', () => {
  test('ADMIN sees full access, including the audit log', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('work-orders');
    await expect(
      page.getByRole('button', { name: 'Create work order' }),
    ).toBeVisible();

    await page.goto('audit');
    await expect(
      page.getByRole('heading', { name: 'Audit log', level: 1 }),
    ).toBeVisible();
  });

  test('SUPERVISOR can create and cancel work orders, and view the audit log', async ({
    page,
  }) => {
    await loginAs(page, SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
    await createWorkOrder(
      page,
      ASSET_TAG,
      `e2e roles supervisor ${Date.now()}`,
    );

    await expect(
      page.getByRole('button', { name: 'Assign to me' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cancel work order' }),
    ).toBeVisible();

    await page.goto('audit');
    await expect(
      page.getByRole('heading', { name: 'Audit log', level: 1 }),
    ).toBeVisible();
  });

  test('TECHNICIAN can create and assign work orders but not cancel them, and /audit is not permitted', async ({
    page,
  }) => {
    await loginAs(page, TECHNICIAN_EMAIL, TECHNICIAN_PASSWORD);
    await createWorkOrder(
      page,
      ASSET_TAG,
      `e2e roles technician ${Date.now()}`,
    );

    await expect(
      page.getByRole('button', { name: 'Assign to me' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cancel work order' }),
    ).toHaveCount(0);

    await page.goto('audit');
    await expect(
      page.getByRole('heading', { name: 'Not permitted', level: 2 }),
    ).toBeVisible();
  });

  test('VIEWER has read-only access and /audit is not permitted', async ({
    page,
  }) => {
    const email = `viewer.e2e.${Date.now()}@example.test`;
    const password = 'E2eTestPass123!';
    const registerResponse = await page.request.post('/auth/register', {
      data: { email, password },
    });
    expect(registerResponse.ok()).toBe(true);

    await loginAs(page, email, password);
    await page.goto('work-orders');
    await expect(
      page.getByRole('button', { name: 'Create work order' }),
    ).toHaveCount(0);

    await page.goto('audit');
    await expect(
      page.getByRole('heading', { name: 'Not permitted', level: 2 }),
    ).toBeVisible();
  });
});
