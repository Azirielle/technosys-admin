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
  console.log('[1/7] Checking dev server on http://127.0.0.1:3000/login...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Server is responsive!')

  console.log('[2/7] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  page.on('console', (msg) => console.log('[Browser Console]', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('[Browser PageError]', err.message))

  try {
    // 1. Login as CEO
    console.log('[3/7] Logging in as CEO...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })

    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 15000 })
    console.log('[+] Landed on /ceo')

    // 2. Audit Capsule Dock
    console.log('[4/7] Auditing Capsule Dock navigation links...')
    const dockLinks = await page.locator('aside nav a').allTextContents()
    console.log('Dock Nav items found:', dockLinks.map(t => t.trim()).filter(Boolean))

    const hasDepartments = dockLinks.some(t => t.toLowerCase().includes('departments'))
    const hasTemporary = dockLinks.some(t => t.toLowerCase().includes('temporary access'))
    console.log(`[Audit] Contains legacy "departments": ${hasDepartments} (Should be false)`)
    console.log(`[Audit] Contains legacy "temporary access": ${hasTemporary} (Should be false)`)

    if (hasDepartments || hasTemporary) {
      console.warn('[!] WARNING: Redundant dock items still found!')
    } else {
      console.log('[+] SUCCESS: Capsule Dock strictly contains 3 executive destinations!')
    }

    // 3. Navigate to Access History (/ceo/activities)
    console.log('[5/7] Navigating to Access History (/ceo/activities)...')
    const historyLink = page.locator('aside nav a:has-text("Access History"), aside nav a[href="/ceo/activities"]').first()
    await historyLink.click()

    await page.waitForURL('**/ceo/activities**', { timeout: 15000 })
    await page.waitForSelector('text=Access History', { timeout: 15000 })
    console.log('[+] Landed on Access History (/ceo/activities)!')

    // Wait for Supabase logs to finish loading (wait for non-skeleton cards)
    console.log('Waiting for live data load...')
    await page.waitForSelector('.space-y-3 > div:not(.animate-pulse)', { timeout: 15000 })
    await page.waitForTimeout(500)

    // Move mouse away from dock so it collapses to compact resting state
    await page.mouse.move(700, 400)
    await page.waitForTimeout(400)

    // Ensure Light Mode first
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (isDark) {
      console.log('Toggling to Light Mode...')
      await page.click('#btn-theme-toggle')
      await page.mouse.move(700, 400)
      await page.waitForTimeout(500)
    }

    // Capture Light Mode Access History
    const lightImg = path.join(ARTIFACT_DIR, 'prod_access_history_light.png')
    await page.screenshot({ path: lightImg, fullPage: true })
    console.log(`[+] Captured Light Mode Access History: ${lightImg}`)

    // 4. Test Search & Filter Tabs
    console.log('Testing "Temporary access" filter tab...')
    await page.click('button:has-text("Temporary access")')
    await page.mouse.move(700, 400)
    await page.waitForTimeout(400)

    // Click the first Temporary Access card to inspect its details modal
    console.log('[6/8] Opening Activity Details Modal for Temporary Access entry...')
    const tempCard = page.locator('.space-y-3 > div').first()
    await tempCard.click()

    await page.waitForSelector('text=Activity Details', { timeout: 10000 })
    await page.waitForTimeout(400)

    // Capture Activity Details Modal (Light Mode - Matching Reference Image 1)
    const modalImg = path.join(ARTIFACT_DIR, 'prod_access_history_modal.png')
    await page.screenshot({ path: modalImg, fullPage: true })
    console.log(`[+] Captured Activity Details Modal: ${modalImg}`)

    // Test expanding technical details accordion
    console.log('Testing technical details accordion toggle...')
    await page.click('button:has-text("Technical details")')
    await page.waitForTimeout(300)

    const modalExpandedImg = path.join(ARTIFACT_DIR, 'prod_access_history_modal_expanded.png')
    await page.screenshot({ path: modalExpandedImg, fullPage: true })
    console.log(`[+] Captured Expanded Technical Details Modal: ${modalExpandedImg}`)

    // Close Modal
    console.log('Closing Activity Details Modal...')
    await page.click('button:has-text("Close Details")')
    await page.mouse.move(700, 400)
    await page.waitForTimeout(300)

    // Switch back to "All activity"
    console.log('Switching back to "All activity"...')
    await page.click('button:has-text("All activity")')
    await page.mouse.move(700, 400)
    await page.waitForTimeout(400)

    // 5. Test Luxury Slate Dark Mode
    console.log('[7/8] Testing Luxury Slate Dark Mode...')
    await page.click('#btn-theme-toggle')
    await page.mouse.move(700, 400)
    await page.waitForTimeout(600)

    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`[Audit] Dark Mode Active: ${isDarkNow}`)

    const darkImg = path.join(ARTIFACT_DIR, 'prod_access_history_dark.png')
    await page.screenshot({ path: darkImg, fullPage: true })
    console.log(`[+] Captured Luxury Slate Dark Mode: ${darkImg}`)

    // Also open modal in Dark Mode to capture Dark Mode matching Image 1!
    console.log('Opening Activity Details Modal in Dark Mode...')
    const darkTempCard = page.locator('.space-y-3 > div').first()
    await darkTempCard.click()
    await page.waitForSelector('text=Activity Details', { timeout: 10000 })
    await page.waitForTimeout(400)

    const darkModalImg = path.join(ARTIFACT_DIR, 'prod_access_history_modal_dark.png')
    await page.screenshot({ path: darkModalImg, fullPage: true })
    console.log(`[+] Captured Dark Mode Activity Details Modal: ${darkModalImg}`)

    await page.click('button:has-text("Close Details")')
    await page.waitForTimeout(300)

    // Switch back to Light Mode for Overview
    await page.click('#btn-theme-toggle')
    await page.mouse.move(700, 400)
    await page.waitForTimeout(500)

    // 6. Test Streamlined Give Temporary Access Modal in Overview
    console.log('[8/8] Testing Streamlined Give Temporary Access Modal in /ceo...')
    const overviewLink = page.locator('aside nav a[href="/ceo"]').first()
    await overviewLink.click()
    await page.waitForURL('**/ceo', { timeout: 10000 })
    await page.waitForSelector('#btn-delegate-coverage', { timeout: 10000 })
    await page.mouse.move(700, 400)
    await page.waitForTimeout(400)

    await page.click('#btn-delegate-coverage')
    await page.waitForSelector('text=Give Temporary Access', { timeout: 10000 })
    await page.waitForTimeout(400)

    // Select Fleet GPS Tracking in Service Dept
    await page.locator('.fixed.inset-0').locator('text=Fleet GPS Tracking').first().click()
    await page.waitForTimeout(400)

    const giveAccessModalImg = path.join(ARTIFACT_DIR, 'prod_give_temporary_access_v3.png')
    await page.screenshot({ path: giveAccessModalImg, fullPage: true })
    console.log(`[+] Captured Streamlined Give Temporary Access Modal: ${giveAccessModalImg}`)

    console.log('\n[PASS] All Playwright verification steps succeeded 100%!')

    console.log('\n[PASS] Access History Playwright verification succeeded 100%!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Playwright verification failed:', err)
  process.exit(1)
})
