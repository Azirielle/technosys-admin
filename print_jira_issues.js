const { chromium } = require('playwright');

async function checkBoard() {
  console.log("Launching browser to inspect Jira board...");
  const profilePath = 'c:/Users/ANDREW/.gemini/antigravity/scratch/chrome-profile';
  
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  
  try {
    console.log("Navigating to Jira board...");
    await page.goto('https://andrewsadarayan.atlassian.net/jira/software/projects/KAN/boards/2', {
      waitUntil: 'load',
      timeout: 30000
    });

    console.log("Jira page loaded. Waiting for cards to render...");
    
    // Wait for card selectors to be visible
    const cardSelector = '[data-testid*="card"], [data-issue-key], [data-issue-id], .ghx-issue';
    await page.locator(cardSelector).first().waitFor({ state: 'visible', timeout: 20000 });
    
    console.log("Cards detected. Parsing titles...");
    const cardTitles = await page.locator('[data-testid*="card-title"], [data-testid="platform-card.card-title"], .ghx-innerText').allTextContents();
    
    console.log(`Found ${cardTitles.length} cards on the board:`);
    cardTitles.forEach((t, i) => console.log(`${i + 1}: ${t.trim()}`));

    // Take screenshot
    await page.screenshot({ path: 'jira_board_check.png' });
    console.log("Screenshot saved to jira_board_check.png");
  } catch (e) {
    console.error("Error checking board:", e);
    // Take an error screenshot
    try {
      await page.screenshot({ path: 'jira_error.png' });
      console.log("Saved error screenshot to jira_error.png");
    } catch (err) {}
  } finally {
    await context.close();
  }
}

checkBoard();
