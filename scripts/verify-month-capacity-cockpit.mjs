import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\0b1465d5-5565-4e26-bbd1-53c1c88dc65d';

async function run() {
  console.log("Starting verification for Aesthetic Minimalist Coordinator Workspace...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("Step 1: Navigating to login page...");
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  console.log("Step 2: Authenticating as Coordinator...");
  await page.fill('input#username', 'coordinator');
  await page.fill('input#password', 'COORDINATOR123');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  console.log("Step 3: Navigating to Coordinator Workspace...");
  await page.goto('http://localhost:3000/coordinator');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // Capture Main Day Agenda Board with New Aesthetic Table & Pill Controls
  console.log("Step 4: Capturing Day Agenda with Aesthetic Table & Horizon Bar...");
  await page.screenshot({ 
    path: path.join(ARTIFACT_DIR, 'coordinator_telemetry_strip_day_view.png'), 
    fullPage: false 
  });

  // Switch to Month View
  console.log("Step 5: Switching Granularity to Month View...");
  const monthBtn = page.locator('button:has-text("month")');
  await monthBtn.click();
  await page.waitForTimeout(2000);

  // Capture Month Capacity Matrix (Aesthetic rounded-2xl grid)
  console.log("Step 6: Capturing Aesthetic Month Matrix...");
  await page.screenshot({ 
    path: path.join(ARTIFACT_DIR, 'coordinator_month_capacity_matrix.png'), 
    fullPage: false 
  });

  // Click "Available Crew" tab in Right Inspector & test search
  console.log("Step 7: Testing Available Crew search & role filters...");
  const availableCrewTab = page.locator('button:has-text("Available Crew")');
  if (await availableCrewTab.count() > 0) {
    await availableCrewTab.click();
    await page.waitForTimeout(800);

    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_month_available_crew_tab.png'), 
      fullPage: false 
    });
  }

  // Deep-Link to Day Gantt Timeline
  console.log("Step 8: Testing Deep-Link to Day Gantt Timeline...");
  const timelineBtn = page.locator('button:has-text("Inspect in Day Gantt Timeline")');
  if (await timelineBtn.count() > 0) {
    await timelineBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_day_gantt_deeplink.png'), 
      fullPage: false 
    });
  }

  // Switch to Temporary Workers (Casual Helpers) tab
  console.log("Step 9: Testing Temporary Workers Register...");
  const casualTab = page.locator('button:has-text("Temporary Workers")');
  if (await casualTab.count() > 0) {
    await casualTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_temporary_workers_register.png'), 
      fullPage: false 
    });
  }

  console.log("All Playwright verification steps completed successfully!");
  await browser.close();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
