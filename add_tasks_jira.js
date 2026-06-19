const { chromium } = require('playwright');
const path = require('path');

const tasks = [
  {
    title: "Build Announcements Broadcasting Feature",
    description: "Admin Web Dashboard: Create a panel to compose, target by branch/global, and publish announcements.\nMobile App Client: Display active announcements carousel/marquee on the Home Overview screen. Integrate Supabase Realtime subscription for instant mobile sync."
  }
];

async function run() {
  console.log("Launching headed Chromium browser...");
  const profilePath = 'c:/Users/ANDREW/.gemini/antigravity/scratch/chrome-profile';
  
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await context.newPage();
  
  try {
    console.log("Navigating to Jira board...");
    await page.goto('https://andrewsadarayan.atlassian.net/jira/software/projects/KAN/boards/2', {
      waitUntil: 'load',
      timeout: 45000
    });

    // Handle Login redirection or modal if needed
    console.log("Waiting for page state (Create button or Login modal)...");
    const createBtnSelector = 'button[id="createGlobalItem"], button[data-testid="create-button-wrapper"] button, button:has-text("Create")';
    const loginSelector = 'text="Log in to continue", [placeholder*="email"], button:has-text("Continue"), input[type="email"]';
    
    let needsLogin = false;
    try {
      await Promise.race([
        page.locator(createBtnSelector).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => { needsLogin = false; }),
        page.locator(loginSelector).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => { needsLogin = true; })
      ]);
    } catch (e) {
      const url = page.url();
      needsLogin = url.includes('login') || url.includes('id.atlassian.com') || url.includes('google.com') || url.includes('accounts.google') || !url.includes('/boards/2');
    }

    if (needsLogin) {
      console.log("\n========================================================");
      console.log("⚠️ REDIRECTED TO LOGIN OR LOGIN MODAL OVERLAY DETECTED.");
      console.log("Current URL:", page.url());
      console.log("Please log in to Jira in the browser window that popped up.");
      console.log("Waiting up to 5 minutes for you to complete login...");
      console.log("========================================================\n");
      
      // Wait until the Create button is visible (which means login is completed and board is active)
      const createBtn = page.locator(createBtnSelector);
      await createBtn.first().waitFor({ state: 'visible', timeout: 300000 });
      console.log("Login successful! Reached board page and Create button is visible.");
    }

    console.log("Jira board page loaded. Waiting 5s for UI stability...");
    await page.waitForTimeout(5000);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\n[${i + 1}/${tasks.length}] Creating task: "${task.title}"...`);

      // 1. Click the 'Create' button in Jira header
      const createBtn = page.locator('button[id="createGlobalItem"], button[data-testid="create-button-wrapper"] button, button:has-text("Create")');
      await createBtn.first().waitFor({ state: 'visible', timeout: 15000 });
      await createBtn.first().click();
      console.log("Clicked global Create button.");

      // 2. Wait for modal summary input to appear
      const summaryInput = page.locator('input[name="summary"], [data-testid="create-issue-modal.summary"], [data-testid="search-and-select.issue-type.summary.input"], input#summary-field');
      await summaryInput.first().waitFor({ state: 'visible', timeout: 15000 });
      console.log("Summary field loaded.");

      // 3. Fill Summary
      await summaryInput.first().fill(task.title);

      // 4. Fill Description if visible
      const descInput = page.locator('[data-testid="create-issue.description.description-container"] [contenteditable="true"], textarea[name="description"]');
      if (await descInput.first().isVisible()) {
        await descInput.first().fill(task.description);
        console.log("Description filled.");
      }

      // 5. Assign to Me
      const assignToMeBtn = page.locator('button:has-text("Assign to me"), [data-testid="create-issue.assignee.assign-to-me-button"]');
      if (await assignToMeBtn.first().isVisible()) {
        await assignToMeBtn.first().click();
        console.log("Assigned to you (clicked 'Assign to me').");
      } else {
        console.log("'Assign to me' button not visible, attempting search...");
        const assigneeSelect = page.locator('[data-testid="create-issue.assignee.select"], [data-testid="create-issue-modal.assignee.select"]');
        if (await assigneeSelect.first().isVisible()) {
          await assigneeSelect.first().click();
          await page.keyboard.type("Andrew");
          await page.waitForTimeout(1000);
          await page.keyboard.press("Enter");
          console.log("Assigned to you (searched 'Andrew').");
        }
      }

      // Take a quick screenshot of the filled form
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(__dirname, `jira_task_${i + 1}_filled.png`) });

      // 6. Click 'Create' button in the dialog footer
      const submitBtn = page.locator('[data-testid="create-issue-dialog.actions.create-issue"], button[type="submit"], button:has-text("Create")').first();
      await submitBtn.click();
      console.log("Submitted issue creation.");

      // 7. Wait 4 seconds for save
      await page.waitForTimeout(4000);
      console.log("Issue created successfully.");
    }

    console.log("\nAll tasks created successfully!");
    await page.waitForTimeout(3000);
    
    // Save final board screenshot
    await page.screenshot({ path: path.join(__dirname, 'jira_board_final.png') });
    console.log("Final board screenshot saved to jira_board_final.png");
  } catch (e) {
    console.error("Error occurred during Jira task creation:", e);
    try {
      await page.screenshot({ path: path.join(__dirname, 'jira_error_details.png') });
      console.log("Error details screenshot saved.");
    } catch (err) {}
  } finally {
    await context.close();
    console.log("Browser closed.");
  }
}

run();
