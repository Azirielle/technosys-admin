import { chromium } from 'playwright'
import path from 'path'
import http from 'http'

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
  console.log('[1/6] Checking dev server responsiveness...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Dev server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active!')

  console.log('[2/6] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  try {
    // 1. Authenticate as CEO
    console.log('[3/6] Authenticating as Administrator...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Authentication successful!')

    // Reset to light mode initially
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'light')
      document.documentElement.classList.remove('dark')
    })
    await page.waitForTimeout(300)

    // 2. Test HR Role Layout & Dock
    console.log('[4/6] Verifying HR Role (/hr/leaves)...')
    await page.goto('http://127.0.0.1:3000/hr/leaves', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    // Verify presence of AdminDock and Porcelain Shell Container
    await page.waitForSelector('aside.group\\/dock', { timeout: 8000 })
    await page.waitForSelector('h1:has-text("Leave Management")', { timeout: 8000 })
    await page.waitForSelector('#btn-dock-quick-actions', { timeout: 5000 })
    await page.waitForSelector('#btn-theme-toggle', { timeout: 5000 })

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_hr_leaves_light.png'),
    })
    console.log('[+] Saved artifact: unified_hr_leaves_light.png')

    // Hover over dock to verify smooth expansion and labels
    const dock = page.locator('aside.group\\/dock')
    await dock.hover()
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_hr_dock_expanded_light.png'),
    })
    console.log('[+] Saved artifact: unified_hr_dock_expanded_light.png')

    // Click profile avatar to verify popover menu
    const profileBtn = dock.locator('button').last()
    await profileBtn.click()
    await page.waitForTimeout(300)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_hr_profile_popover_light.png'),
    })
    console.log('[+] Saved artifact: unified_hr_profile_popover_light.png')

    // Close profile menu
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Dark Mode verification for HR
    console.log('Testing HR Dark Mode...')
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_hr_leaves_dark.png'),
    })
    console.log('[+] Saved artifact: unified_hr_leaves_dark.png')

    // 3. Test Coordinator Role Layout & Dock
    console.log('[5/6] Verifying Coordinator Role (/coordinator)...')
    // Reset to light mode
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'light')
      document.documentElement.classList.remove('dark')
    })
    await page.goto('http://127.0.0.1:3000/coordinator', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await page.waitForSelector('aside.group\\/dock', { timeout: 8000 })
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_coordinator_light.png'),
    })
    console.log('[+] Saved artifact: unified_coordinator_light.png')

    // Dark Mode for Coordinator
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_coordinator_dark.png'),
    })
    console.log('[+] Saved artifact: unified_coordinator_dark.png')

    // 4. Test Accountant Role Layout & Dock
    console.log('[6/6] Verifying Accountant Role (/accountant)...')
    // Reset to light mode
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'light')
      document.documentElement.classList.remove('dark')
    })
    await page.goto('http://127.0.0.1:3000/accountant', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await page.waitForSelector('aside.group\\/dock', { timeout: 8000 })
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_accountant_light.png'),
    })
    console.log('[+] Saved artifact: unified_accountant_light.png')

    // Dark Mode for Accountant
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'unified_accountant_dark.png'),
    })
    console.log('[+] Saved artifact: unified_accountant_dark.png')

    console.log('\n===> ALL ADMIN ROLES UNIFIED DOCK REGRESSION CHECKS PASSED! <===')
  } catch (err) {
    console.error('Test Failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
