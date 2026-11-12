import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\0b1465d5-5565-4e26-bbd1-53c1c88dc65d';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input#username', 'coordinator');
  await page.fill('input#password', 'COORDINATOR123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  await page.goto('http://localhost:3000/coordinator');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Switch to Month view
  const monthBtn = page.getByRole('button', { name: 'month', exact: true });
  await monthBtn.click();
  await page.waitForTimeout(1500);

  // Click on the List toggle button in HorizonFilterBar while still on Month view
  const listToggle = page.locator('button[aria-label="Table List View"]');
  await listToggle.click();
  await page.waitForTimeout(1500);

  // This will show all month assignments in the new aesthetic table!
  await page.screenshot({ 
    path: path.join(ARTIFACT_DIR, 'coordinator_aesthetic_table_populated.png'), 
    fullPage: false 
  });

  await browser.close();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
