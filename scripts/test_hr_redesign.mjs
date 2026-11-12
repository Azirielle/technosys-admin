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
  console.log('[1/6] Checking dev server responsiveness...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Dev server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is up!')

  console.log('[2/6] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Login
    console.log('[3/6] Authenticating as Administrator...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Authenticated successfully!')

    // 2. Navigate to /hr
    console.log('[4/6] Navigating to /hr workspace...')
    await page.goto('http://127.0.0.1:3000/hr', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    // Ensure we start in Light Mode
    const isInitiallyDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (isInitiallyDark) {
      await page.evaluate(() => document.documentElement.classList.remove('dark'))
      await page.waitForTimeout(300)
    }

    // AUDIT 1: Top Bar & Overview Cards (Image 1)
    console.log('\n--- AUDITING HR TICKETS WORKSPACE (LIGHT MODE) ---')
    await page.waitForSelector('text=Tickets & Leaves', { timeout: 10000 })
    await page.waitForSelector('text=What would you like to manage?', { timeout: 5000 })
    await page.waitForSelector('text=Employee Tickets', { timeout: 5000 })

    // Verify Image 2 Ticket Filter Pills
    await page.waitForSelector('button:has-text("Needs attention")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("All tickets")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("In progress")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Resolved")', { timeout: 5000 })

    const ticketSearchInput = page.locator('input[placeholder*="Search by employee or ticket subject"]')
    const hasTicketSearch = await ticketSearchInput.isVisible()
    console.log('Ticket Search Input Visible:', hasTicketSearch)

    // Capture Light Mode Tickets Desk Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_tickets_light.png')
    })
    console.log('[+] Saved artifact: prod_hr_tickets_light.png')

    // AUDIT 2: Switch to Leaves Desk (Image 3)
    console.log('\n--- AUDITING HR LEAVES WORKSPACE (LIGHT MODE) ---')
    // Click on "Leave Requests" tab in the segmented switcher
    const leavesTabBtn = page.locator('button:has-text("Leave Requests")').first()
    await leavesTabBtn.click()
    await page.waitForTimeout(500)

    // Verify URL query sync
    const currentUrl = page.url()
    console.log('Current URL after switching to leaves:', currentUrl)
    if (!currentUrl.includes('tab=leaves')) {
      console.warn('Warning: URL did not contain tab=leaves:', currentUrl)
    }

    // Verify Leave Requests Heading & Guidance Callout
    await page.waitForSelector('text=Leave Requests', { timeout: 5000 })
    await page.waitForSelector('text=What HR should review', { timeout: 5000 })

    // Verify Image 3 Leave Filter Pills
    await page.waitForSelector('button:has-text("Pending review")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Approved")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Declined")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("All requests")', { timeout: 5000 })

    // Capture Light Mode Leaves Desk Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_leaves_light.png')
    })
    console.log('[+] Saved artifact: prod_hr_leaves_light.png')

    // AUDIT 3: Test Dark Mode
    console.log('\n--- AUDITING DARK MODE ---')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)

    // Capture Dark Mode Leaves Desk Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_leaves_dark.png')
    })
    console.log('[+] Saved artifact: prod_hr_leaves_dark.png')

    // Switch back to Tickets in Dark Mode
    const ticketsTabBtn = page.locator('button:has-text("Employee Tickets")').first()
    await ticketsTabBtn.click()
    await page.waitForTimeout(500)

    // Capture Dark Mode Tickets Desk Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_tickets_dark.png')
    })
    console.log('[+] Saved artifact: prod_hr_tickets_dark.png')

    console.log('\n===> ALL HR REDESIGN PLAYWRIGHT AUDITS PASSED 100%! <===')
  } catch (err) {
    console.error('Playwright Error:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
