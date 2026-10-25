import type { Page } from '@playwright/test';

export async function selectAppearance(page: Page, mode: 'Light' | 'Dark' | 'System') {
  const navigation = page.getByRole('navigation', { name: 'Main sections' });
  const selected = navigation.locator('[aria-current="page"]');
  const section = (await selected.getAttribute('aria-label')) ?? (await selected.innerText());
  if (section !== 'Settings')
    await navigation.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('group', { name: 'Appearance mode' })
    .getByRole('radio', { name: mode, exact: true })
    .check();
  if (section !== 'Settings')
    await navigation.getByRole('button', { name: section, exact: true }).click();
}
