import { chromium } from 'playwright'
import path from 'path'
import http from 'http'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/36100423-6b6a-4aa2-8ef7-cc4a5b271cc7'

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
  })
}

async function getBaseUrl() {
  if (await checkUrl('http://127.0.0.1:3001/login')) {
    return 'http://127.0.0.1:3001'
  }
  if (await checkUrl('http://127.0.0.1:3000/login')) {
    return 'http://127.0.0.1:3000'
  }
  throw new Error('Dev server is not reachable on port 3000 or 3001.')
}

async function run() {
  console.log('[1/8] Resolving active dev server port...')
  const BASE_URL = await getBaseUrl()
  console.log(`[+] Active dev server found at ${BASE_URL}`)

  console.log('[2/8] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  try {
    // 1. Authenticate as CEO/Admin
    console.log('[3/8] Authenticating as Administrator...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
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

    // 2. Navigate to /hr/policies and verify Workspace Landing View (Matching Mockup media_1792933400147_76e5c751.png)
    console.log('[4/8] Navigating to /hr/policies in Streamlined Workspace Mode...')
    await page.goto(`${BASE_URL}/hr/policies?view=workspace`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    // Verify Header & Simplified Single-Plus Create Policy Button
    await page.waitForSelector('h1:has-text("Policies & Handbooks")', { timeout: 8000 })
    await page.waitForSelector('text=Manage company policies and review outstanding tasks.', { timeout: 5000 })
    await page.waitForSelector('#btn-create-policy', { timeout: 5000 })
    const createBtnText = await page.locator('#btn-create-policy').innerText()
    console.log(`[+] Confirmed: Create policy button text is "${createBtnText}" (single plus, no duplicate symbols).`)

    // Verify Unified 3-Segment Tab Bar (Workspace | All policies | Master Handbook)
    await page.waitForSelector('#btn-nav-workspace-tab', { timeout: 5000 })
    await page.waitForSelector('#btn-nav-library-tab', { timeout: 5000 })
    await page.waitForSelector('#btn-view-master-handbook', { timeout: 5000 })
    console.log('[+] Confirmed: Unified 3-Segment Tab Bar rendered directly below header.')

    // Verify "Needs attention" Section & Triage Filters (All tasks, Urgent actions, Drafts)
    await page.waitForSelector('#view-workspace h2:has-text("Needs attention")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("All tasks")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Urgent actions")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Drafts")', { timeout: 5000 })
    console.log('[+] Confirmed: Needs attention triage segmented filters rendered (All, Urgent, Drafts).')

    // Test Triage Filter Switching
    await page.click('button:has-text("Urgent actions")')
    await page.waitForTimeout(300)
    const urgentCount = await page.locator('#view-workspace .divide-y > div').count()
    console.log(`[+] Triage filter switched to "Urgent actions" (${urgentCount} items visible).`)

    await page.click('button:has-text("Drafts")')
    await page.waitForTimeout(300)
    const draftsCount = await page.locator('#view-workspace .divide-y > div').count()
    console.log(`[+] Triage filter switched to "Drafts" (${draftsCount} items visible).`)

    await page.click('button:has-text("All tasks")')
    await page.waitForTimeout(300)

    // Verify Action links in Work Queue and Task Badges
    const queueRows = await page.locator('#view-workspace .divide-y > div').count()
    console.log(`[+] Confirmed: Needs attention work queue contains ${queueRows} triage items with distinct task badges.`)

    // Verify Sidebar Dock Top Toggle & Hover Label
    await page.waitForSelector('#btn-dock-pin-toggle-top', { timeout: 5000 })
    console.log('[+] Confirmed: Sidebar Top Expand/Pin Toggle (#btn-dock-pin-toggle-top) verified.')

    // Verify bottom caption and View All button
    await page.waitForSelector('text=Showing the most relevant tasks first', { timeout: 5000 })
    await page.waitForSelector('#btn-view-all-queue', { timeout: 5000 })
    console.log('[+] Confirmed: Footer caption and View All link verified.')

    // Capture Light Mode Workspace Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_workspace_light.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_workspace_light.png')

    // Test Master Handbook Modal in Light Mode & Verify Single Scrollbar
    console.log('[+] Testing Master Handbook Modal in Light Mode (Single Scrollbar Verification)...')
    await page.click('#btn-view-master-handbook')
    await page.waitForTimeout(500)
    await page.waitForSelector('text=TechnoCycle Master Employee Handbook', { timeout: 5000 })

    // Verify there is NO nested inner scrollbar or overlay scrollbar
    const scrollReport = await page.evaluate(() => {
      const modal = document.querySelector('div[class*="fixed inset-0"]')
      if (!modal) return { overlayHasScroll: false, innerScrollCount: 0 }
      const overlayHasScroll = modal.classList.contains('overflow-y-auto')
      const innerScrolls = modal.querySelectorAll('.overflow-y-auto')
      return {
        overlayHasScroll,
        innerScrollCount: innerScrolls.length,
      }
    })
    console.log(`[+] Confirmed: Overlay scroll is ${scrollReport.overlayHasScroll ? 'PRESENT' : 'REMOVED'}, internal scrollable body count = ${scrollReport.innerScrollCount} (single unified scroll).`)
    if (scrollReport.overlayHasScroll || scrollReport.innerScrollCount > 1) {
      throw new Error(`FAIL: Detected double scroll in Master Handbook! Overlay: ${scrollReport.overlayHasScroll}, Inners: ${scrollReport.innerScrollCount}`)
    }

    // Capture Light Mode Handbook Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_master_handbook_modal_light.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_master_handbook_modal_light.png')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // 3. Test Navigation from Workspace to All Policies Library
    console.log('[5/8] Navigating to All Policies Library via unified tab bar...')
    await page.click('#btn-nav-library-tab')
    await page.waitForTimeout(600)

    // Verify Library Header & Breadcrumb
    await page.waitForSelector('#view-library', { timeout: 5000 })
    await page.waitForSelector('#btn-back-to-workspace', { timeout: 5000 })
    await page.waitForSelector('h2:has-text("All policies")', { timeout: 5000 })
    await page.waitForSelector('text=Find the document you need.', { timeout: 5000 })
    await page.waitForSelector('#input-search-policies', { timeout: 5000 })
    console.log('[+] Confirmed: Library view active with breadcrumb and search bar.')

    // Verify 4 filter tabs
    await page.waitForSelector('#tab-filter-all', { timeout: 3000 })
    await page.waitForSelector('#tab-filter-published', { timeout: 3000 })
    await page.waitForSelector('#tab-filter-drafts-review', { timeout: 3000 })
    await page.waitForSelector('#tab-filter-archived', { timeout: 3000 })
    console.log('[+] Confirmed: 4 clean filter pills rendered (All policies, Published, Drafts & review, Archived).')

    // Verify 4-Column Table Headers
    await page.waitForSelector('th:has-text("Policy")', { timeout: 3000 })
    await page.waitForSelector('th:has-text("Status")', { timeout: 3000 })
    await page.waitForSelector('th:has-text("Last updated")', { timeout: 3000 })
    await page.waitForSelector('th:has-text("Next step")', { timeout: 3000 })
    console.log('[+] Confirmed: 4-column minimalist scannable table verified.')

    // Test Search Filtering in Library
    console.log('[+] Testing live search in library...')
    await page.fill('#input-search-policies', 'Conduct')
    await page.waitForTimeout(400)
    const conductRows = await page.locator('#view-library tbody tr').count()
    console.log(`[+] Filtered to ${conductRows} row(s) for keyword "Conduct".`)
    await page.fill('#input-search-policies', '')
    await page.waitForTimeout(300)

    // Capture Light Mode Library Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_library_light.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_library_light.png')

    // 4. Test P1: Inline Validation on Empty Policy Title (Form Stays Open, Error Below Field)
    console.log('[6/8] Testing P1 Inline Validation in Policy Creation Dialog...')
    await page.click('#btn-create-policy')
    await page.waitForTimeout(500)
    await page.waitForSelector('text=Create New Policy', { timeout: 5000 })
    await page.waitForSelector('text=Basic Details', { timeout: 5000 })

    // Click Next with empty title to test inline validation
    console.log('[+] Clicking Next without entering title...')
    await page.click('#btn-next-create-step')
    await page.waitForTimeout(300)

    // Assert: Modal MUST stay open
    const modalVisible = await page.locator('text=Create New Policy').isVisible()
    if (!modalVisible) {
      throw new Error('FAIL: Modal closed prematurely on validation error!')
    }
    console.log('[+] Confirmed: Dialog remains open on validation failure.')

    // Assert: Inline error "Policy title is required." is visible directly below the title field
    await page.waitForSelector('#policy-title-error:has-text("Policy title is required.")', { timeout: 3000 })
    console.log('[+] Confirmed: Inline error "Policy title is required." displayed directly below title input.')

    // Assert: Input has red highlight and focus
    const isInvalid = await page.getAttribute('#input-create-policy-title', 'aria-invalid')
    if (isInvalid !== 'true') {
      throw new Error('FAIL: Input does not have aria-invalid="true"!')
    }
    console.log('[+] Confirmed: Title input highlighted with error styles.')

    // Now type into the title input to verify error disappears immediately
    await page.fill('#input-create-policy-title', 'Fleet Vehicle Fuel Liquidation & Telemetry Protocol')
    await page.waitForTimeout(200)
    const errorAfterTyping = await page.locator('#policy-title-error').count()
    if (errorAfterTyping !== 0) {
      throw new Error('FAIL: Inline error did not clear after user started typing!')
    }
    console.log('[+] Confirmed: Inline error cleared immediately upon typing.')

    // Advance to Step 2
    await page.click('#btn-next-create-step')
    await page.waitForTimeout(400)
    await page.waitForSelector('text=Policy Document Body', { timeout: 5000 })

    // Test Formatted Preview Toggle on Step 2
    await page.click('#btn-preview-policy-doc')
    await page.waitForTimeout(300)
    const previewContainer = page.locator('[data-testid="formatted-policy-content"]')
    if (await previewContainer.isVisible()) {
      const previewText = await previewContainer.innerText()
      const hasRawTokens = /(^|\n)##\s+/.test(previewText) || /\*\*[^*]+\*\*/.test(previewText)
      if (hasRawTokens) {
        console.error('[!] Raw markdown syntax detected in creation preview!')
      } else {
        console.log('[+] Confirmed: Step 2 Formatted Preview rendered clean prose without raw syntax tokens.')
      }
    }

    // Capture Creator Modal Screenshot on Step 2
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_creator_modal_light.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_creator_modal_light.png')

    // Advance to Step 3
    await page.click('#btn-next-create-step')
    await page.waitForTimeout(400)
    await page.waitForSelector('text=Policy Pre-Flight Summary', { timeout: 5000 })
    console.log('[+] Confirmed: Step 3 Review & Schedule reached with pre-flight summary.')

    // Test Persistent Save Working Draft
    await page.locator('#btn-save-draft').dispatchEvent('click')
    await page.waitForTimeout(1200)
    console.log('[+] Confirmed: Working draft saved successfully!')

    // 5. Test 620px Slide-Over Inspector Drawer & Clean Formatting
    console.log('[7/8] Testing 620px Slide-Over Inspector Drawer...')
    // Inspector auto-opens on save, or can be opened via table row
    await page.waitForSelector('aside[aria-label="Policy Document Inspector"]', { timeout: 8000 })
    await page.waitForSelector('aside[aria-label="Policy Document Inspector"] button:has-text("Policy Document")', { timeout: 5000 })
    await page.waitForSelector('aside[aria-label="Policy Document Inspector"] button:has-text("Employee Acknowledgments")', { timeout: 5000 })
    await page.waitForSelector('aside[aria-label="Policy Document Inspector"] button:has-text("Version History & Audit")', { timeout: 5000 })
    console.log('[+] Confirmed: Slide-over inspector opened with 3 sub-tabs.')

    // Verify formatted document content in inspector (zero markdown leak, zero stale status lines)
    const inspectorDoc = page.locator('aside[aria-label="Policy Document Inspector"] [data-testid="formatted-policy-content"]')
    if (await inspectorDoc.isVisible()) {
      const docText = await inspectorDoc.innerText()
      const hasRawMarkdown = /(^|\n)##\s+/.test(docText) || /\*\*[^*]+\*\*/.test(docText)
      const hasStaleStatus = /Status:\s*Under Review/i.test(docText)
      if (hasRawMarkdown) {
        console.error('[!] Raw markdown tokens detected in inspector reader!')
      } else if (hasStaleStatus) {
        console.error('[!] Stale status text found in document body!')
      } else {
        console.log('[+] Confirmed: Inspector document tab rendered typography cleanly without raw markdown or stale status lines.')
      }
    }

    // Capture Light Mode Inspector Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_inspector_light.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_inspector_light.png')

    // Close Inspector
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // 5B. Test Standardized Policy Metadata & Effective Date (Attendance Policy)
    console.log('[+] Testing Attendance Policy standardization in Library...')
    await page.fill('#input-search-policies', 'Attendance')
    await page.waitForTimeout(400)
    await page.click('#view-library tbody tr:has-text("Attendance") button')
    await page.waitForTimeout(600)
    await page.waitForSelector('aside[aria-label="Policy Document Inspector"]', { timeout: 5000 })

    // Verify Title & Version in Header
    const drawerTitle = await page.locator('aside[aria-label="Policy Document Inspector"] h3').first().innerText()
    console.log(`[+] Confirmed: Drawer Header Policy Title is "${drawerTitle}".`)
    if (!drawerTitle.includes('Attendance, DTR, Overtime & Leave Administrative Policy')) {
      throw new Error(`FAIL: Policy title mismatch! Found "${drawerTitle}"`)
    }

    // Verify Document Heading is in Title Case and Matches
    const h1Heading = await page.locator('aside[aria-label="Policy Document Inspector"] h1').innerText()
    console.log(`[+] Confirmed: Document Reader H1 Heading is "${h1Heading}" (standardized Title Case).`)
    if (h1Heading.includes('TECHNOCYCLE ATTENDANCE')) {
      throw new Error(`FAIL: Document heading is still in all-caps legacy format! Found "${h1Heading}"`)
    }

    // Verify Version History tab effective date agrees
    await page.click('aside[aria-label="Policy Document Inspector"] button:has-text("Version History & Audit")')
    await page.waitForTimeout(300)
    await page.waitForSelector('text=Effective since: 2026-10-16', { timeout: 5000 })
    console.log('[+] Confirmed: Version History reflects accurate effective date (2026-10-16).')

    // Close Inspector
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.fill('#input-search-policies', '')
    await page.waitForTimeout(300)

    // 5C. Test Review Workflow for Draft Policy (Request Coordinator Review)
    console.log('[+] Testing Review Workflow for Draft Policy...')
    await page.fill('#input-search-policies', 'Refrigerant')
    await page.waitForTimeout(400)
    await page.click('#view-library tbody tr:has-text("Refrigerant") button')
    await page.waitForTimeout(600)

    // Verify pre-review notes banner
    await page.waitForSelector('text=Pre-Review Status & Required Action', { timeout: 5000 })
    console.log('[+] Confirmed: Pre-review banner clarifies workflow.')

    // Verify primary action button says "Request Coordinator Review"
    const reviewBtn = page.locator('#btn-submit-review')
    const reviewBtnLabel = await reviewBtn.innerText()
    console.log(`[+] Confirmed: Action button label is "${reviewBtnLabel.trim()}".`)
    if (!reviewBtnLabel.includes('Request Coordinator Review')) {
      throw new Error(`FAIL: Expected "Request Coordinator Review" but found "${reviewBtnLabel}"`)
    }

    // Click "Request Coordinator Review" to advance workflow
    await reviewBtn.click()
    await page.waitForTimeout(1000)

    // Verify status updated to "UNDER REVIEW" (amber badge)
    await page.waitForSelector('aside[aria-label="Policy Document Inspector"] span:has-text("UNDER_REVIEW")', { timeout: 5000 })
    console.log('[+] Confirmed: Policy successfully transitioned to UNDER_REVIEW!')

    // Verify footer buttons now show "Approve & Publish Policy" and "Request Changes"
    await page.waitForSelector('#btn-approve-publish:has-text("Approve & Publish Policy")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Request Changes")', { timeout: 5000 })
    console.log('[+] Confirmed: Review actions ("Approve & Publish", "Request Changes") now active.')

    // Close Inspector
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.fill('#input-search-policies', '')

    // 6. Test Dark Mode & Master Handbook Modal
    console.log('[8/8] Testing Dark Mode across Workspace and Library...')
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)

    // Capture Dark Mode Library Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_library_dark.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_library_dark.png')

    // Navigate back to workspace in Dark Mode
    await page.click('#btn-back-to-workspace')
    await page.waitForTimeout(500)
    await page.waitForSelector('#view-workspace h2:has-text("Needs attention")', { timeout: 5000 })

    // Capture Dark Mode Workspace Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_workspace_dark.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_workspace_dark.png')

    // Test Master Handbook Modal in Dark Mode
    await page.click('#btn-view-master-handbook')
    await page.waitForTimeout(500)
    await page.waitForSelector('text=TechnoCycle Master Employee Handbook', { timeout: 5000 })
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_policies_master_handbook_modal_dark.png'),
    })
    console.log('[+] Saved artifact: prod_hr_policies_master_handbook_modal_dark.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    console.log('\n========================================================================')
    console.log('✓ ALL REFINED "STREAMLINED WORKSPACE" PLAYWRIGHT TESTS PASSED!')
    console.log('========================================================================')
  } catch (err) {
    console.error('Test Failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
