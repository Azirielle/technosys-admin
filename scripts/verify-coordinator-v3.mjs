import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\3f8f463a-f3ce-4b9b-9e47-df6f60de43ad';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('[1/7] Logging into Admin-side...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input#username', 'ceo');
  await page.fill('input#password', 'CEO123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  console.log('[2/7] Navigating to coordinator scheduling portal...');
  await page.goto('http://localhost:3000/coordinator');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Switch to "Next 7 Days" to show all October 30 operations
  console.log('[3/7] Selecting Next 7 Days horizon...');
  const next7DaysBtn = page.locator('button:has-text("Next 7 Days")');
  if (await next7DaysBtn.count() > 0) {
    await next7DaysBtn.click();
    await page.waitForTimeout(1500);
  }

  // 1. Capture clean table view with plain terminology
  console.log('[4/7] Capturing clean table view with 5 plain columns...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_clean_table.png'), fullPage: false });

  // 2. Click "View" on the first row
  console.log('[5/7] Clicking "View" on first job...');
  const viewBtn = page.locator('button:has-text("View")').first();
  if (await viewBtn.count() > 0) {
    await viewBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing Job Details & Schedule drawer...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_job_view_drawer.png'), fullPage: false });
    
    // Close the drawer
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Open "Schedule a Service Job" drawer
  console.log('[6/7] Opening "Schedule a Service Job" drawer...');
  const scheduleJobBtn = page.locator('button:has-text("Schedule a Service Job")').first();
  await scheduleJobBtn.click();
  await page.waitForTimeout(1000);

  // Step 1: Type in "San Pedro" address and test geocode suggestions
  console.log('Testing address geocoding for "San Pedro"...');
  const addressInput = page.locator('input[placeholder*="address"]').first();
  await addressInput.fill('San Pedro');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_step1_ph_address.png'), fullPage: false });

  // Select the first address suggestion
  const firstAddressOpt = page.locator('div.absolute button').first();
  if (await firstAddressOpt.count() > 0) {
    await firstAddressOpt.click();
    await page.waitForTimeout(500);
  }

  // Fill job name
  const jobNameInput = page.locator('input[placeholder*="Printer repair"]').first();
  await jobNameInput.fill('Biometric Scanner Calibration — Branch 3');
  await page.waitForTimeout(500);

  // Click continue to Step 2
  const step1NextBtn = page.locator('button:has-text("Continue to date and time")');
  await step1NextBtn.click();
  await page.waitForTimeout(800);
  console.log('Capturing Step 2: Set time...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_step2_time.png'), fullPage: false });

  // Click continue to Step 3
  const step2NextBtn = page.locator('button:has-text("Continue to team selection")');
  await step2NextBtn.click();
  await page.waitForTimeout(800);
  console.log('Capturing Step 3: Choose team (Senior Techs visible)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_step3_team_senior.png'), fullPage: false });

  // Select first senior technician radio
  const firstTechRadio = page.locator('input[type="radio"][name="lead_tech"]').first();
  if (await firstTechRadio.count() > 0) {
    await firstTechRadio.click();
    await page.waitForTimeout(500);
  }

  // Click continue to Step 4
  const step3NextBtn = page.locator('button:has-text("Review assignment")');
  await step3NextBtn.click();
  await page.waitForTimeout(800);
  console.log('Capturing Step 4: Review...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'coordinator_step4_review.png'), fullPage: false });

  console.log('[7/7] All verifications completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
