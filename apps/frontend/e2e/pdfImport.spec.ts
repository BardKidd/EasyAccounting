import { test, expect } from '@playwright/test';

test('User can manually add and view pending transactions in Bill Import', async ({
  page,
}) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  // Navigate and login directly
  await page.goto('/login');
  if (email && password) {
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: '登入', exact: true }).click();
  } else {
    // If no configured env vars, assume it's hardcoded test or dev session
    // Try filling it with default values or skip
    await page.getByPlaceholder('name@example.com').fill('test1234@gmail.com');
    await page.getByPlaceholder('••••••••').fill('test1234');
    await page.getByRole('button', { name: '登入', exact: true }).click();
  }

  // Wait for login redirect
  await page.waitForURL('**/dashboard');

  // Mock API for getting pending transactions
  let requestCount = 0;
  await page.route('**/api/pdf/pending*', async (route) => {
    if (route.request().method() === 'GET') {
      if (requestCount === 0) {
        requestCount++;
        await route.fulfill({
          json: {
            isSuccess: true,
            data: {
              data: [
                {
                  id: 'mock-manual-1',
                  userId: 'user-123',
                  status: 'PENDING',
                  transactionData: {
                    date: '2026-02-15',
                    time: '12:00:00',
                    description: 'Initial Mock Item',
                    amount: 150,
                    type: 'expense',
                  },
                },
              ],
              activeJob: null,
            },
          },
        });
      } else {
        // Second time polled, return the created one
        await route.fulfill({
          json: {
            isSuccess: true,
            data: {
              data: [
                {
                  id: 'mock-manual-1',
                  userId: 'user-123',
                  status: 'PENDING',
                  transactionData: {
                    date: '2026-02-15',
                    time: '12:00:00',
                    description: 'Initial Mock Item',
                    amount: 150,
                    type: 'expense',
                  },
                },
                {
                  id: 'mock-manual-2',
                  userId: 'user-123',
                  status: 'PENDING',
                  transactionData: {
                    date: '2026-02-15',
                    time: '12:00:00',
                    description: 'Manual Mock Item',
                    amount: 150,
                    type: 'expense',
                  },
                },
              ],
              activeJob: null,
            },
          },
        });
      }
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          isSuccess: true,
          data: {
            id: 'mock-manual-2',
            status: 'PENDING',
            transactionData: {
              date: '2026-02-15',
              time: '12:00:00',
              description: 'Manual Mock Item',
              amount: 150,
              type: 'expense',
            },
          },
        },
      });
    } else {
      route.continue();
    }
  });

  // Mock confirm
  await page.route('**/api/pdf/confirm', async (route) => {
    await route.fulfill({
      json: { isSuccess: true, data: { created: 2, skipped: 0 } },
    });
  });

  // Go to Bill Import page
  await page.goto('/bill-import');
  await page.waitForSelector('text=帳單匯入');
  await expect(page.locator('input[value="Initial Mock Item"]')).toBeVisible();

  // Click on manual add button
  const manualAddBtn = page.getByRole('button', {
    name: '手動新增',
    exact: true,
  });
  await expect(manualAddBtn).toBeVisible();
  await manualAddBtn.click();

  // It should now poll and get the data (since requestCount > 0 now).
  await expect(page.locator('input[value="Manual Mock Item"]')).toBeVisible();

  const confirmBtn = page.getByRole('button', {
    name: '確認匯入全部',
    exact: true,
  });
  await expect(confirmBtn).toBeVisible();
});
