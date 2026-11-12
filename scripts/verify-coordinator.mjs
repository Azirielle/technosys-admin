import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\3f8f463a-f3ce-4b9b-9e47-df6f60de43ad';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("Navigating to login page...");
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  console.log("Submitting login form...");
  await page.fill('input#username', 'ceo');
  await page.fill('input#password', 'CEO123');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  console.log("Navigating to coordinator scheduling page...");
  await page.goto('http://localhost:3000/coordinator');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click "Next 7 Days" to show active schedules in October 2026
  console.log("Clicking Next 7 Days button...");
  const next7DaysBtn = page.locator('button:has-text("Next 7 Days")');
  if (await next7DaysBtn.count() > 0) {
    await next7DaysBtn.click();
    await page.waitForTimeout(1500);
    console.log("Capturing Next 7 Days populated table...");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_next7days_table.png'), fullPage: false });
  }

  // Click Reschedule on the first row
  console.log("Clicking Reschedule on first schedule row...");
  const rescheduleBtn = page.locator('button[title*="Reschedule"]').first();
  if (await rescheduleBtn.count() > 0) {
    await rescheduleBtn.click();
    await page.waitForTimeout(1000);
    console.log("Capturing Quick Reschedule Drawer...");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_reschedule_active.png'), fullPage: false });
  }

  // Switch to Timeline View on Next 7 Days
  console.log("Switching to Timeline view...");
  const timelineBtn = page.locator('button:has-text("Timeline")');
  if (await timelineBtn.count() > 0) {
    // Pick date 2026-10-30 in custom date picker to see blocks on timeline!
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2026-10-30');
    await page.waitForTimeout(1000);
    await timelineBtn.click();
    await page.waitForTimeout(1500);
    console.log("Capturing Timeline with October 30 blocks...");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_timeline_populated.png'), fullPage: false });
  }

  console.log("Run completed successfully!");
  await browser.close();
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
