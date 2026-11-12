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
    // 1. Authenticate as CEO/Admin
    console.log('[3/6] Authenticating as Administrator...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Authentication successful!')

    // Reset to light mode initially and ensure dock is unpinned
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'light')
      localStorage.removeItem('@technocycle_dock_pinned')
      document.documentElement.classList.remove('dark')
    })
    await page.waitForTimeout(300)

    // 2. Navigate to /hr/files
    console.log('[4/6] Navigating to /hr/files...')
    await page.goto('http://127.0.0.1:3000/hr/files', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    // Verify presence of header, compact KPI cards, table
    await page.waitForSelector('h1:has-text("201 Files")', { timeout: 8000 })
    await page.waitForSelector('text=Field Personnel', { timeout: 5000 })
    await page.waitForSelector('text=Incomplete Files', { timeout: 5000 })
    await page.waitForSelector('text=Active Warnings', { timeout: 5000 })
    await page.waitForSelector('text=Verified Complete', { timeout: 5000 })

    // Verify role scoping: Admin accounts must NOT appear in the table
    const tableText = await page.locator('table').innerText()
    const forbiddenAdmins = ['Abby Coordinator', 'Aileen Coordinator', 'Alicia Accountant', 'CEO']
    for (const admin of forbiddenAdmins) {
      if (tableText.includes(admin)) {
        throw new Error(`Regression Error: Admin account "${admin}" detected in technician 201 Files table!`)
      }
    }
    console.log('[+] Confirmed: Zero admin accounts present in technician 201 Files ledger!')

    // Verify filter simplification: Redundant "All Status" dropdown is removed
    const hasStatusDropdown = await page.locator('select option:has-text("All Status")').count()
    if (hasStatusDropdown > 0) {
      throw new Error('Regression Error: Redundant "All Status" dropdown is still present!')
    }
    console.log('[+] Confirmed: Redundant "All Status" dropdown successfully purged.')

    // Verify table columns
    await page.waitForSelector('th:has-text("Position & Status")', { timeout: 3000 })
    await page.waitForSelector('th:has-text("Outstanding Requirements & Next Action")', { timeout: 3000 })
    console.log('[+] Confirmed: Task-oriented table column architecture verified!')

    // 3. Test Incomplete Files Tab & Next Action badges
    console.log('Testing "Incomplete Files" triage tab...')
    await page.click('button:has-text("Incomplete Files")')
    await page.waitForTimeout(400)
    const incompleteBadges = await page.locator('text=/Missing:/').count()
    console.log(`[+] Found ${incompleteBadges} missing document defect indicators in incomplete triage view.`)

    // Save light mode overview screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_201_files_overview_light.png'),
    })
    console.log('[+] Saved artifact: prod_hr_201_files_overview_light.png')

    // 4. Test Slide-Over Inspector & Action Controls
    console.log('[5/6] Testing Master-Detail Slide-Over Inspector & Action Controls...')
    const viewFileBtn = page.locator('button:has-text("View file")').first()
    if (await viewFileBtn.isVisible()) {
      await viewFileBtn.click()
      await page.waitForTimeout(500)

      // Verify inspector elements
      await page.waitForSelector('aside[aria-label="Employee 201 Inspector"]', { timeout: 5000 })
      await page.waitForSelector('text=201 Requirements', { timeout: 5000 })

      // Verify explicit action buttons inside requirements list: View/Replace or Upload
      const uploadButtons = await page.locator('aside[aria-label="Employee 201 Inspector"] button:has-text("+ Upload")').count()
      const viewButtons = await page.locator('aside[aria-label="Employee 201 Inspector"] button:has-text("View")').count()
      console.log(`[+] Inspector contains ${uploadButtons} "+ Upload" triggers and ${viewButtons} "View" text actions.`)

      // Verify sticky footer contains "Send Compliance Notice" or "All statutory requirements verified"
      const hasComplianceNotice = await page.locator('button#btn-request-documents').isVisible()
      const hasVerifiedBanner = await page.locator('text=All statutory requirements verified').isVisible()
      if (!hasComplianceNotice && !hasVerifiedBanner) {
        throw new Error('Inspector sticky footer failed to render contextual compliance action!')
      }
      console.log('[+] Inspector sticky footer rendered correct context-adaptive action.')

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'prod_hr_201_inspector_light.png'),
      })
      console.log('[+] Saved artifact: prod_hr_201_inspector_light.png')

      // Switch to Warnings sub-tab in inspector
      const warningsTab = page.locator('aside[aria-label="Employee 201 Inspector"] button:has-text("Warnings")')
      await warningsTab.click()
      await page.waitForTimeout(400)

      // Verify sticky footer is NOT present on Warnings sub-tab
      const footerOnWarnings = await page.locator('button#btn-request-documents').isVisible()
      if (footerOnWarnings) {
        throw new Error('Footer button inappropriately shown on Warnings sub-tab!')
      }

      // Verify Statutory Notice button in header
      const issueNoticeBtn = page.locator('button:has-text("+ Issue Disciplinary Notice")')
      await issueNoticeBtn.click()
      await page.waitForTimeout(300)

      // Verify Notice Modal
      await page.waitForSelector('text="Issue Disciplinary Notice"', { timeout: 3000 })
      await page.waitForSelector('button:has-text("Issue Notice")', { timeout: 3000 })
      console.log('[+] Statutory Labor Code Art. 297 Due Process Notice modal verified.')
      await page.click('button:has-text("Cancel")')
      await page.waitForTimeout(300)

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'prod_hr_201_warnings_tab_light.png'),
      })
      console.log('[+] Saved artifact: prod_hr_201_warnings_tab_light.png')

      // Switch back to requirements tab and capture light inspector
      const reqTabLight = page.locator('aside[aria-label="Employee 201 Inspector"] button:has-text("201 Requirements")')
      await reqTabLight.click()
      await page.waitForTimeout(300)

      // Close inspector to return to clean table overview
      const closeInspectorLight = page.locator('button[title="Close inspector"]')
      await closeInspectorLight.click()
      await page.waitForTimeout(400)
    }

    // 5. Test Sidebar Dock Pinning Capability
    console.log('[6/6] Testing Dock Pinning & Dynamic Layout Spacer...')
    const pinBtn = page.locator('#btn-dock-pin-toggle')
    await pinBtn.click()
    await page.waitForTimeout(500)

    const isPinnedInStorage = await page.evaluate(() => localStorage.getItem('@technocycle_dock_pinned'))
    if (isPinnedInStorage !== 'true') {
      throw new Error('Dock pin toggle did not persist "@technocycle_dock_pinned" to localStorage!')
    }
    console.log('[+] Dock pinning persisted to localStorage successfully.')

    // Verify pinned dock width expansion
    const dockBox = await page.locator('aside[aria-label="Admin Navigation Dock"]').boundingBox()
    if (!dockBox || dockBox.width < 200) {
      throw new Error(`Dock did not expand to pinned width (actual width: ${dockBox?.width}px)`)
    }
    console.log(`[+] Confirmed: Pinned dock width is ${dockBox.width}px.`)

    // 6. Test Dark Mode
    console.log('Testing Dark Mode...')
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)

    // Open inspector on first employee in dark mode
    const viewFileBtnDark = page.locator('button:has-text("View file")').first()
    if (await viewFileBtnDark.isVisible()) {
      await viewFileBtnDark.click()
      await page.waitForTimeout(400)

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'prod_hr_201_inspector_dark.png'),
      })
      console.log('[+] Saved artifact: prod_hr_201_inspector_dark.png')

      // Close inspector
      const closeInspectorDark = page.locator('button[title="Close inspector"]')
      await closeInspectorDark.click()
      await page.waitForTimeout(400)
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_201_files_overview_dark.png'),
    })
    console.log('[+] Saved artifact: prod_hr_201_files_overview_dark.png')

    console.log('\n=============================================================')
    console.log('✓ ALL HR 201 FILES & ADMIN DOCK PLAYWRIGHT TESTS PASSED!')
    console.log('=============================================================')
  } catch (err) {
    console.error('Test Failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()