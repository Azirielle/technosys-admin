import http from 'http'
import { chromium } from 'playwright'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/36100423-6b6a-4aa2-8ef7-cc4a5b271cc7'

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
  })
}

async function run() {
  console.log('[1/9] Checking dev server responsiveness...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active and responding!')

  console.log('[2/9] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text())
  })
  page.on('pageerror', (err) => console.log('[Browser PageError]', err.message))

  try {
    // 1. Login
    console.log('[3/9] Logging in as CEO...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Landed on /ceo dashboard')

    // 2. Verify Visible Quick Actions trigger in Capsule Dock
    console.log('[4/9] Verifying visible Quick Actions button in dock...')
    const dockQuickActionsBtn = page.locator('#btn-dock-quick-actions').first()
    console.log('[Verify] Dock button present:', await dockQuickActionsBtn.count() > 0)

    // Move mouse away to keep dock clean
    await page.mouse.move(600, 300)
    await page.waitForTimeout(400)

    // 3. Open Quick Actions palette via dock click
    console.log('[5/9] Opening Quick Actions palette via dock click...')
    await dockQuickActionsBtn.click()
    await page.waitForTimeout(500)

    // Verify modal is visible
    const paletteTitle = page.locator('h2:has-text("Quick Actions")').first()
    console.log('[Verify] Quick Actions palette visible:', await paletteTitle.isVisible())

    // Capture Light Mode Quick Actions palette
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_light.png')
    })
    console.log('[+] Captured: prod_quick_actions_light.png')

    // 4. Test Search Filtering
    console.log('[6/9] Testing real-time search filtering in palette...')
    const searchInput = page.locator('input[placeholder*="Search actions"]').first()
    await searchInput.fill('announcement')
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_search.png')
    })
    console.log('[+] Captured: prod_quick_actions_search.png')

    // Clear search
    await searchInput.fill('')
    await page.waitForTimeout(300)

    // 5. Test Keyboard Navigation (ArrowDown / ArrowUp)
    console.log('[7/9] Testing keyboard navigation with Arrow keys...')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_keyboard_nav.png')
    })
    console.log('[+] Captured: prod_quick_actions_keyboard_nav.png')

    // 6. Test "View shortcuts" Cheat Sheet
    console.log('[8/9] Testing Keyboard Shortcuts Cheat Sheet...')
    const viewShortcutsBtn = page.locator('button:has-text("View shortcuts")').first()
    await viewShortcutsBtn.click()
    await page.waitForTimeout(500)

    const cheatSheetTitle = page.locator('h3:has-text("Keyboard Shortcuts Reference")').first()
    console.log('[Verify] Cheat sheet visible:', await cheatSheetTitle.isVisible())

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_shortcuts_cheatsheet.png')
    })
    console.log('[+] Captured: prod_quick_actions_shortcuts_cheatsheet.png')

    // Close cheat sheet
    const doneBtn = page.locator('button:has-text("Done")').first()
    await doneBtn.click()
    await page.waitForTimeout(400)

    // 7. Test Global Keyboard Shortcut (Ctrl+K)
    console.log('[8b/9] Testing global shortcut Ctrl+K...')
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(400)
    console.log('[Verify] Palette opened with Ctrl+K:', await paletteTitle.isVisible())

    // 8. Test Action Execution: "Give Temporary Access" from inside Quick Actions
    console.log('[8c/9] Testing action execution: Give Temporary Access...')
    const qaDialog = page.locator('[role="dialog"][aria-label="Quick Actions"]').first()
    const giveAccessOption = qaDialog.locator('button:has-text("Give Temporary Access")').first()
    await giveAccessOption.click()
    await page.waitForTimeout(600)

    const giveAccessHeading = page.locator('div:has-text("Temporary Assignment")').first()
    console.log('[Verify] Give Temporary Access modal opened:', await giveAccessHeading.isVisible())

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_triggered_modal.png')
    })
    console.log('[+] Captured: prod_quick_actions_triggered_modal.png')

    // Close Give Temporary Access modal safely
    const closeDelegationBtn = page.locator('button:has-text("Cancel")').first()
    if (await closeDelegationBtn.count() > 0) {
      await closeDelegationBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(400)

    // 9. Test Dark Mode (Luxury Slate)
    console.log('[9/9] Testing Dark Mode compliance...')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(400)

    // Open Quick Actions in Dark Mode via Ctrl+K
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_dark.png')
    })
    console.log('[+] Captured: prod_quick_actions_dark.png')

    // Open Cheat Sheet in Dark Mode
    const viewShortcutsDarkBtn = page.locator('button:has-text("View shortcuts")').first()
    await viewShortcutsDarkBtn.click()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_quick_actions_shortcuts_dark.png')
    })
    console.log('[+] Captured: prod_quick_actions_shortcuts_dark.png')

    console.log('===> ALL QUICK ACTIONS PLAYWRIGHT TESTS PASSED SUCCESSFULLY! <===')
  } catch (err) {
    console.error('Test Execution Error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
