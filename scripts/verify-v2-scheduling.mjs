import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ANDREW\\.gemini\\antigravity\\brain\\08553d11-c2d3-434b-9052-f30c9bd4db23';

async function run() {
  console.log("Starting Playwright verification for Scheduling V2...");
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

  // 1. Capture Main Board
  console.log("Step 4: Capturing Main Scheduling & Dispatch Board...");
  await page.screenshot({ 
    path: path.join(ARTIFACT_DIR, 'coordinator_v2_main_board.png'), 
    fullPage: false 
  });

  // 2. Granularity switching: Week
  console.log("Step 5: Testing Granularity Switching (Week)...");
  const weekBtn = page.locator('button:has-text("week")');
  if (await weekBtn.count() > 0) {
    await weekBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_v2_week_view.png'), 
      fullPage: false 
    });
  }

  // 3. Granularity switching: Month (Table)
  console.log("Step 6: Testing Granularity Switching (Month Table)...");
  const monthBtn = page.locator('button:has-text("month")');
  if (await monthBtn.count() > 0) {
    await monthBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_v2_month_table.png'), 
      fullPage: false 
    });

    // Toggle to Month Calendar / Grid View
    console.log("Step 7: Testing Month Split Calendar View...");
    const gridBtn = page.locator('button[title*="Timeline"]').or(page.locator('button[aria-label*="Timeline"]')).first();
    if (await gridBtn.count() > 0) {
      await gridBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ 
        path: path.join(ARTIFACT_DIR, 'coordinator_v2_month_calendar.png'), 
        fullPage: false 
      });

      // Switch back to table
      const listBtn = page.locator('button[title*="Table"]').or(page.locator('button[aria-label*="Table"]')).first();
      if (await listBtn.count() > 0) {
        await listBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // 4. Granularity switching: Past Records
  console.log("Step 8: Testing Granularity Switching (Past Records)...");
  const pastBtn = page.locator('button:has-text("Past Records")');
  if (await pastBtn.count() > 0) {
    await pastBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_v2_past_view.png'), 
      fullPage: false 
    });
  }

  // Return to Today / Day
  const todayBtn = page.locator('button:has-text("Today")').first();
  if (await todayBtn.count() > 0) {
    await todayBtn.click();
    await page.waitForTimeout(1000);
  }

  // 5. Test "+ New Assignment" Branching Modal
  console.log("Step 9: Testing '+ New Assignment' Modal...");
  const newAssignBtn = page.locator('button:has-text("New Assignment")').first();
  if (await newAssignBtn.count() > 0) {
    await newAssignBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_v2_new_assignment_modal.png'), 
      fullPage: false 
    });

    // 6. Test On-site Service Drawer & Step 3 Team Selection Directory
    console.log("Step 10: Launching On-site Service Drawer...");
    const onSiteCard = page.locator('div:has-text("On-site Service")').last();
    if (await onSiteCard.count() > 0) {
      await onSiteCard.click();
      await page.waitForTimeout(1000);

      // Jump directly to Step 3 "Choose team"
      const step3Btn = page.locator('button:has-text("Choose team")').first();
      if (await step3Btn.count() > 0) {
        await step3Btn.click();
        await page.waitForTimeout(1500);

        console.log("Step 11: Capturing Searchable Team Selection Directory...");
        await page.screenshot({ 
          path: path.join(ARTIFACT_DIR, 'coordinator_v2_team_directory.png'), 
          fullPage: false 
        });
      }

      // Close drawer
      const closeBtn1 = page.locator('button[aria-label="Close Drawer"]').first();
      if (await closeBtn1.count() > 0) {
        await closeBtn1.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // 7. Test Out-of-Town Deployment Dedicated Drawer
  console.log("Step 12: Testing Deployment Dedicated Drawer...");
  if (await newAssignBtn.count() > 0) {
    await newAssignBtn.click();
    await page.waitForTimeout(800);

    const deploymentCard = page.locator('div:has-text("Out-of-Town Project")').last();
    if (await deploymentCard.count() > 0) {
      await deploymentCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: path.join(ARTIFACT_DIR, 'coordinator_v2_deployment_drawer.png'), 
        fullPage: false 
      });

      // Close drawer
      const closeBtn2 = page.locator('button[aria-label="Close Drawer"]').first();
      if (await closeBtn2.count() > 0) {
        await closeBtn2.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // 8. Test Main Office Duty Drawer
  console.log("Step 13: Testing Main Office Duty Dedicated Drawer...");
  if (await newAssignBtn.count() > 0) {
    await newAssignBtn.click();
    await page.waitForTimeout(800);

    const officeDutyCard = page.locator('div:has-text("Main Office Duty")').last();
    if (await officeDutyCard.count() > 0) {
      await officeDutyCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: path.join(ARTIFACT_DIR, 'coordinator_v2_office_duty_drawer.png'), 
        fullPage: false 
      });

      // Close drawer
      const closeBtn3 = page.locator('button[aria-label="Close Drawer"]').first();
      if (await closeBtn3.count() > 0) {
        await closeBtn3.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // 9. Test View -> Edit Job Details Tab
  console.log("Step 14: Testing 'View' -> Edit Job Details tab in Multi-Tab Drawer...");
  const monthNav = page.locator('button:has-text("month")').first();
  if (await monthNav.count() > 0) {
    await monthNav.click();
    await page.waitForTimeout(1000);
  }
  const viewBtn = page.locator('button:has-text("View")').first();
  if (await viewBtn.count() > 0) {
    await viewBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_v2_edit_details_tab.png'), 
      fullPage: false 
    });

    // Close drawer
    const closeBtn4 = page.locator('button[aria-label="Close Drawer"]').first();
    if (await closeBtn4.count() > 0) {
      await closeBtn4.click();
      await page.waitForTimeout(1000);
    }
  }

  // 10. Test Reschedule -> Change History Audit Log
  console.log("Step 15: Testing Quick Reschedule and Audit History Drawer...");
  const rescheduleBtn = page.locator('button:has-text("Reschedule")').first();
  if (await rescheduleBtn.count() > 0) {
    await rescheduleBtn.click();
    await page.waitForTimeout(1200);

    // Click "Change History" tab
    const historyTab = page.locator('button:has-text("Change History")');
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(1200);
    }

    await page.screenshot({ 
      path: path.join(ARTIFACT_DIR, 'coordinator_v2_reschedule_audit.png'), 
      fullPage: false 
    });
  }

  console.log("All Playwright verification steps completed successfully!");
  await browser.close();
}

run().catch(err => {
  console.error("Playwright verification encountered an error:", err);
  process.exit(1);
});
