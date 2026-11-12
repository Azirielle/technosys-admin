import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\3f8f463a-f3ce-4b9b-9e47-df6f60de43ad';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.fill('input#username', 'ceo');
  await page.fill('input#password', 'CEO123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  await page.goto('http://localhost:3000/coordinator');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  console.log("Capturing today view with smart upcoming link...");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_today_with_upcoming.png'), fullPage: false });

  await browser.close();
}

run().catch(console.error);
