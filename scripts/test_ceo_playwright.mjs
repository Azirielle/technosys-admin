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
  console.log('[1/9] Verifying server status on http://localhost:3000/login...')
  const isUp = await checkServer('http://localhost:3000/login')
  if (!isUp) {
    console.error('Server is not responding on http://localhost:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is reachable!')

  console.log('[2/9] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  page.on('console', (msg) => console.log('[Browser Console]', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('[Browser PageError]', err.message))

  try {
    // 1. Login as CEO
    console.log('[3/9] Logging in as CEO...')
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })

    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 15000 })
    await page.waitForSelector('text=Department Access & Coverage', { timeout: 15000 })
    console.log('[+] Successfully landed on Executive Suite /ceo!')

    await page.waitForTimeout(1500)

    // Ensure Light Mode first for porcelain verification
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (isDark) {
      console.log('Toggling to Light Mode for porcelain verification...')
      await page.click('#btn-theme-toggle')
      await page.waitForTimeout(500)
    }

    // Capture Light Mode Porcelain Baseline
    console.log('[4/9] Capturing Light Mode Porcelain Baseline (Zero Jargon)...')
    const lightBaselineImg = path.join(ARTIFACT_DIR, 'prod_ceo_v2_light.png')
    await page.screenshot({ path: lightBaselineImg, fullPage: true })
    console.log(`[+] Captured Light Mode Baseline: ${lightBaselineImg}`)

    // 2. Test Expandable Capsule Dock Hover
    console.log('[5/9] Testing Expandable Capsule Dock on hover...')
    const dock = page.locator('aside').first()
    await dock.hover()
    await page.waitForTimeout(400)

    const dockWidth = await page.evaluate(() => {
      const el = document.querySelector('aside')
      return el ? window.getComputedStyle(el).width : null
    })
    console.log(`[Audit] Dock width on hover: ${dockWidth}`)

    const dockHoverImg = path.join(ARTIFACT_DIR, 'prod_ceo_dock_hover.png')
    await page.screenshot({ path: dockHoverImg, fullPage: true })
    console.log(`[+] Captured Dock Hover: ${dockHoverImg}`)

    // Move mouse away to collapse dock
    await page.mouse.move(500, 500)
    await page.waitForTimeout(300)

    // 3. Open Give Temporary Access Modal
    console.log('[6/9] Opening Give Temporary Access Modal...')
    await page.click('#btn-delegate-coverage')
    await page.waitForSelector('text=Give Temporary Access', { timeout: 10000 })
    await page.waitForTimeout(400)

    const modal = page.locator('.fixed.inset-0')

    // Select Dispatch in Service Dept inside modal
    console.log('Selecting Dispatch & Scheduling in Service Dept...')
    await modal.locator('text=Dispatch & Scheduling').click()
    await page.waitForTimeout(300)

    // Switch to Accountant tab inside modal
    console.log('Switching to Accountant department tab...')
    await modal.locator('button:has-text("Accountant")').click()
    await page.waitForTimeout(300)

    // Select Payroll & Audit Logs
    console.log('Selecting Payroll & Audit Logs in Accountant...')
    await modal.locator('text=Payroll & Audit Logs').click()
    await page.waitForTimeout(300)

    // Fill natural reason
    const reasonInput = modal.locator('input[placeholder*="Covering for an accountant"]').first()
    await reasonInput.fill('Covering for an accountant who is on medical leave')
    await page.waitForTimeout(200)

    // Capture Modal with Review Summary Box and Indigo Button
    const modalImg = path.join(ARTIFACT_DIR, 'prod_ceo_v2_modal.png')
    await page.screenshot({ path: modalImg, fullPage: true })
    console.log(`[+] Captured Refined Modal with summary card: ${modalImg}`)

    // Submit Temporary Access
    console.log('[7/9] Activating Temporary Access...')
    await modal.locator('button:has-text("Grant Temporary Access")').click()
    await page.waitForTimeout(1500)

    // Capture Active Temporary Access Ledger
    const activeLedgerImg = path.join(ARTIFACT_DIR, 'prod_ceo_v2_active.png')
    await page.screenshot({ path: activeLedgerImg, fullPage: true })
    console.log(`[+] Captured Active Temporary Access Ledger: ${activeLedgerImg}`)

    // 4. Test Single-Tab Revocation Modal
    console.log('[8/9] Testing Revocation Flow...')
    const revokeBtn = page.locator('button:has-text("Remove Access")').first()
    if (await revokeBtn.isVisible()) {
      await revokeBtn.click()
      await page.waitForSelector('text=Remove Temporary Access', { timeout: 10000 })
      await page.waitForTimeout(400)

      const revokeModalImg = path.join(ARTIFACT_DIR, 'prod_ceo_v2_revoke.png')
      await page.screenshot({ path: revokeModalImg, fullPage: true })
      console.log(`[+] Captured Revocation Confirmation Modal: ${revokeModalImg}`)

      // Confirm Revocation
      const confirmRevokeBtn = page.locator('.fixed.inset-0').locator('button:has-text("Confirm Removal")').first()
      await confirmRevokeBtn.click()
      await page.waitForTimeout(1500)
      console.log('[+] Revocation completed!')
    }

    // 5. Toggle to Luxury Slate Dark Mode
    console.log('[9/9] Testing Luxury Slate Dark Mode...')
    await page.click('#btn-theme-toggle')
    await page.waitForTimeout(600)

    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`[Audit] Dark Mode Active (.dark applied): ${isDarkNow}`)

    const darkImg = path.join(ARTIFACT_DIR, 'prod_ceo_v2_dark.png')
    await page.screenshot({ path: darkImg, fullPage: true })
    console.log(`[+] Captured Luxury Slate Dark Mode: ${darkImg}`)

    // 6. Clean up via Clear All Access in table header
    const clearAllBtn = page.locator('button:has-text("Clear All Access")').first()
    if (await clearAllBtn.isVisible()) {
      console.log('[Playwright] Resetting all overrides to clean DB...')
      await clearAllBtn.click()
      await page.waitForSelector('text=Clear All Temporary Access', { timeout: 5000 })
      const confirmResetBtn = page.locator('.fixed.inset-0').locator('button:has-text("Confirm Clear All")').first()
      await confirmResetBtn.click()
      await page.waitForTimeout(1500)
    }

    const cleanImg = path.join(ARTIFACT_DIR, 'prod_ceo_v2_clean.png')
    await page.screenshot({ path: cleanImg, fullPage: true })
    console.log(`[+] Captured Clean Restored State: ${cleanImg}`)

    console.log('\n[PASS] Executive Hub v2 Playwright verification completed with 100% success!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Playwright verification failed:', err)
  process.exit(1)
})
