const { chromium } = require('playwright');
const path = require('path');

async function verify() {
  console.log("Launching Chromium with persistent user profile...");
  const profilePath = 'c:/Users/ANDREW/.gemini/antigravity/scratch/chrome-profile';
  
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    viewport: { width: 1280, height: 800 }
  });

  const page = context.pages()[0] || await context.newPage();
  
  try {
    console.log("Navigating to Jira board...");
    await page.goto('https://andrewsadarayan.atlassian.net/jira/software/projects/KAN/boards/2', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log("Page loaded. URL:", page.url());
    console.log("Title:", await page.title());

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'jira_check.png');
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot saved to:", screenshotPath);
  } catch (e) {
    console.error("Error navigating:", e);
  } finally {
    await context.close();
  }
}

verify();
