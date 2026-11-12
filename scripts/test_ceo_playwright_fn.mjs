import { chromium } from 'playwright'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/36100423-6b6a-4aa2-8ef7-cc4a5b271cc7'

export async function runSuite() {
  console.log('[Playwright] Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Login as CEO
    console.log('[Playwright] Navigating to http://localhost:3001/login...')
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' })

    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    console.log('[Playwright] Waiting for navigation to /ceo...')
    await page.waitForURL('**/ceo**', { timeout: 25000 })
    await page.waitForSelector('text=Department Operations & Coverage', { timeout: 25000 })
    console.log('[Playwright] [+] Landed on Executive Operational Hub /ceo!')

    await page.waitForTimeout(1000)

    // Ensure Light Mode first for porcelain verification
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (isDark) {
      console.log('[Playwright] Toggling to Light Mode...')
      const themeToggle = page.locator('aside button[title*="Mode"]').first()
      if (await themeToggle.isVisible()) {
        await themeToggle.click()
        await page.waitForTimeout(500)
      }
    }

    // Capture Light Mode Porcelain Baseline
    console.log('[Playwright] Capturing Light Mode Porcelain Baseline...')
    const lightBaselineImg = path.join(ARTIFACT_DIR, 'prod_ceo_exec_light.png')
    await page.screenshot({ path: lightBaselineImg, fullPage: true })
    console.log(`[Playwright] [+] Saved: ${lightBaselineImg}`)

    // 2. Open Delegation Modal
    console.log('[Playwright] Opening Granular Capability Delegation Modal...')
    const delegateBtn = page.locator('button:has-text("Delegate Department Coverage")').first()
    await delegateBtn.click()
    await page.waitForSelector('text=Operational Delegation', { timeout: 10000 })
    await page.waitForTimeout(400)

    // Select Dispatch in Service Dept
    console.log('[Playwright] Selecting Dispatch & Scheduling in Service Dept...')
    const dispatchCard = page.locator('div:has-text("Dispatch & Scheduling")').last()
    await dispatchCard.click()
    await page.waitForTimeout(300)

    // Switch to Accountant tab
    console.log('[Playwright] Switching to Accountant tab...')
    const acctTab = page.locator('button:has-text("Accountant")').first()
    await acctTab.click()
    await page.waitForTimeout(300)

    // Select Payroll & Audit Logs
    console.log('[Playwright] Selecting Payroll & Audit Logs in Accountant...')
    const auditCard = page.locator('div:has-text("Payroll & Audit Logs")').last()
    await auditCard.click()
    await page.waitForTimeout(300)

    // Fill audit reason
    const reasonInput = page.locator('input[placeholder*="Technician geofence"]').first()
    await reasonInput.fill('Shift handover verification for accounting logs')
    await page.waitForTimeout(200)

    // Capture Modal with Cumulative Selection
    const modalImg = path.join(ARTIFACT_DIR, 'prod_ceo_exec_modal.png')
    await page.screenshot({ path: modalImg, fullPage: true })
    console.log(`[Playwright] [+] Saved: ${modalImg}`)

    // Submit Delegation
    console.log('[Playwright] Submitting delegation...')
    const submitDelegationBtn = page.locator('button:has-text("Confirm & Activate")').first()
    await submitDelegationBtn.click()
    await page.waitForTimeout(1500)

    // Capture Active Delegations in Ledger
    const activeLedgerImg = path.join(ARTIFACT_DIR, 'prod_ceo_exec_active.png')
    await page.screenshot({ path: activeLedgerImg, fullPage: true })
    console.log(`[Playwright] [+] Saved: ${activeLedgerImg}`)

    // 3. Test Revocation Modal
    console.log('[Playwright] Testing Revocation Flow...')
    const revokeBtn = page.locator('button:has-text("Revoke Tab")').first()
    if (await revokeBtn.isVisible()) {
      await revokeBtn.click()
      await page.waitForSelector('text=Revoke Delegated Scope', { timeout: 10000 })
      await page.waitForTimeout(400)

      const revokeModalImg = path.join(ARTIFACT_DIR, 'prod_ceo_exec_revoke.png')
      await page.screenshot({ path: revokeModalImg, fullPage: true })
      console.log(`[Playwright] [+] Saved: ${revokeModalImg}`)

      // Confirm Revocation
      const confirmRevokeBtn = page.locator('button:has-text("Confirm Revocation")').first()
      await confirmRevokeBtn.click()
      await page.waitForTimeout(1500)
      console.log('[Playwright] [+] Revocation completed!')
    }

    // 4. Toggle to Dark Mode
    console.log('[Playwright] Toggling to Luxury Slate Dark Mode...')
    const themeToggleDark = page.locator('aside button[title*="Mode"]').first()
    await themeToggleDark.click()
    await page.waitForTimeout(600)

    const darkImg = path.join(ARTIFACT_DIR, 'prod_ceo_exec_dark.png')
    await page.screenshot({ path: darkImg, fullPage: true })
    console.log(`[Playwright] [+] Saved: ${darkImg}`)

    // 5. Clean up via Reset All if active overrides remain
    const resetAllBtn = page.locator('button:has-text("Reset All")').first()
    if (await resetAllBtn.isVisible()) {
      console.log('[Playwright] Resetting all overrides to clean DB...')
      await resetAllBtn.click()
      await page.waitForSelector('text=Reset All Workstations to Default Scope', { timeout: 5000 })
      const confirmResetBtn = page.locator('button:has-text("Reset All Now")').first()
      await confirmResetBtn.click()
      await page.waitForTimeout(1500)
    }

    const cleanImg = path.join(ARTIFACT_DIR, 'prod_ceo_exec_clean.png')
    await page.screenshot({ path: cleanImg, fullPage: true })
    console.log(`[Playwright] [+] Saved: ${cleanImg}`)

    console.log('[Playwright] All checks passed!')
  } finally {
    await browser.close()
  }
}
