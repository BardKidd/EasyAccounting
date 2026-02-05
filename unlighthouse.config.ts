// unlighthouse.config.ts
export default {
  // 要掃描的頁面列表（登入後才能訪問的頁面）
  urls: [
    '/',
    '/login',
    '/dashboard',
    '/transactions',
    '/accounts',
    '/statistics',
    '/reconciliation',
    '/budgets',
    '/settings',
  ],

  // 模擬桌面版 (Dashboard 通常看桌面版比較準)
  scanner: {
    device: 'desktop',
    // 增加 SPA 支援
    dynamicSampling: 10,
    throttle: true,
  },

  hooks: {
    // 這裡就是教它怎麼登入的地方
    async authenticate(page: any) {
      // 1. 去登入頁面
      await page.goto('https://riinouo-eaccounting.win/login');

      // 2. 輸入帳號 (請用測試帳號！)
      // 尋找 input[name="email"] 欄位，輸入帳號
      await page.type('input[name="email"]', process.env.TEST_USER_EMAIL);

      // 3. 輸入密碼
      await page.type('input[name="password"]', process.env.TEST_USER_PASSWORD);

      // 4. 點擊登入按鈕 & 等待跳轉
      // Promise.all 是為了確保「點擊」和「等待跳轉」同時發生，避免 Race Condition
      await Promise.all([
        page.waitForNavigation(), // 等待網址改變
        page.click('button[type="submit"]'), // 點擊按鈕
      ]);

      // 5. 等待 Dashboard 載入完成
      await page.waitForSelector('main', { timeout: 10000 });
    },
  },
};
