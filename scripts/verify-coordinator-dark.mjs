import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\3f8f463a-f3ce-4b9b-9e47-df6f60de43ad';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("Logging in...");
  await page.goto('http://localhost:3000/login');
  await page.fill('input#username', 'ceo');
  await page.fill('input#password', 'CEO123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  console.log("Navigating to coordinator...");
  await page.goto('http://localhost:3000/coordinator');
  await page.waitForLoadState('networkidle');

  // Toggle Dark Mode
  console.log("Toggling Dark Mode...");
  const darkBtn = page.locator('button:has-text("Dark Mode")');
  if (await darkBtn.count() > 0) {
    await darkBtn.first().click();
    await page.waitForTimeout(500);
  }

  // Click Next 7 Days
  const next7DaysBtn = page.locator('button:has-text("Next 7 Days")');
  if (await next7DaysBtn.count() > 0) {
    await next7DaysBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log("Capturing Dark Mode Table View...");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_dark_table.png'), fullPage: false });

  // Open Dispatch Drawer in Dark Mode
  const scheduleTechBtn = page.locator('button:has-text("Schedule Technician")').first();
  if (await scheduleTechBtn.count() > 0) {
    await scheduleTechBtn.click();
    await page.waitForTimeout(1000);
    console.log("Capturing Dark Mode Dispatch Drawer...");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_dark_drawer.png'), fullPage: false });
  }

  await browser.close();
}

run().catch(err => {
  console.error("Dark mode capture failed:", err);
  process.exit(1);
});
