import { test as base, expect, type Page } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './env';
import { claimAdminSlot, STORAGE_STATE } from './storage-state';

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: 'Overview', level: 1 }),
  ).toBeVisible();
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export const test = base.extend<{
  adminPage: Page;
  supervisorPage: Page;
  technicianPage: Page;
  viewerPage: Page;
}>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: claimAdminSlot(),
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(await context.newPage());
    await context.close();
  },
  supervisorPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.supervisor,
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(await context.newPage());
    await context.close();
  },
  technicianPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.technician,
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(await context.newPage());
    await context.close();
  },
  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.viewer,
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(await context.newPage());
    await context.close();
  },
});

export { expect };
export type { Page };
