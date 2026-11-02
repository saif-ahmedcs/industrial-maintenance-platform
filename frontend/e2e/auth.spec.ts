import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './fixtures';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './env';

test.describe('auth', () => {
  test('signs in with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/app\/?$/);
  });

  test('shows an error for a wrong password', async ({ page }) => {
    await page.goto('login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'Email or password is not correct.',
    );
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('signs out back to the login page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/app\/login$/);
    await page.goto('work-orders');
    await expect(page).toHaveURL(/\/app\/login/);
  });

  test('redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('work-orders');
    await expect(page).toHaveURL(/\/app\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app\/work-orders$/);
  });
});
