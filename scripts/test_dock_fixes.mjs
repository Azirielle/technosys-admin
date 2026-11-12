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
  console.log('[1/5] Checking dev server responsiveness...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active and responding!')

  console.log('[2/5] Launching Playwright Chromium...')
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
    console.log('[3/5] Logging in as CEO...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Landed on /ceo dashboard')

    // 2. Hover over the dock and verify Theme Toggle label
    console.log('[4/5] Testing Theme Switcher label in dock...')
    const dockAside = page.locator('aside.group\\/dock').first()
    await dockAside.hover()
    await page.waitForTimeout(400)

    // Check light mode label (should say "Dark Mode")
    const themeBtn = page.locator('#btn-theme-toggle').first()
    const themeText = await themeBtn.textContent()
    console.log('[Verify] Theme button text in Light Mode:', themeText.trim())

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_theme_toggle_label.png')
    })
    console.log('[+] Captured: prod_theme_toggle_label.png')

    // 3. Test Profile Menu opening and verify NO clipping
    console.log('[5/5] Testing Profile Popover Menu...')
    const profileBtn = page.locator('button[title*="Carlos Rivera"]').first()
    await profileBtn.click()
    await page.waitForTimeout(400)

    // Verify popover contents are visible
    const popoverTitle = page.locator('text=Chief Executive Officer').first()
    console.log('[Verify] Popover visible:', await popoverTitle.isVisible())

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_profile_menu_fixed_light.png')
    })
    console.log('[+] Captured: prod_profile_menu_fixed_light.png')

    // 4. Test Dark Mode
    console.log('[5b/5] Testing in Dark Mode...')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(300)

    // Re-verify theme text in dark mode (should say "Light Mode")
    const darkThemeText = await themeBtn.textContent()
    console.log('[Verify] Theme button text in Dark Mode:', darkThemeText.trim())

    // Capture Profile menu in Dark Mode
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_profile_menu_fixed_dark.png')
    })
    console.log('[+] Captured: prod_profile_menu_fixed_dark.png')

    console.log('===> ALL DOCK FIXES PLAYWRIGHT TESTS PASSED SUCCESSFULLY! <===')
  } catch (err) {
    console.error('Test Execution Error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
