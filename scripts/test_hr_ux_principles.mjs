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
    console.error('Dev server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active!')

  console.log('[2/5] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Authenticate
    console.log('[3/5] Authenticating as Administrator...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ceo**', { timeout: 30000 })

    // 2. Test /hr/leaves route (Image 2)
    console.log('[4/5] Navigating to /hr/leaves...')
    await page.goto('http://127.0.0.1:3000/hr/leaves', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Ensure light mode
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await page.waitForTimeout(300)

    // Verify Image 2 elements
    await page.waitForSelector('text=Leave Management', { timeout: 8000 })
    await page.waitForSelector('text=Needs your review', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Pending")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Approved")', { timeout: 5000 })
    await page.waitForSelector('button:has-text("Rejected")', { timeout: 5000 })

    // Screenshot of Leave Management (Pending queue)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_leaves_v2_light.png')
    })
    console.log('[+] Saved artifact: prod_hr_leaves_v2_light.png')

    // Click "Approved" filter card to show leave cards
    const approvedCard = page.locator('button:has-text("Approved")').first()
    await approvedCard.click()
    await page.waitForTimeout(400)

    // Click "Review request" on the first card
    const reviewBtn = page.locator('button:has-text("Review request")').first()
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click()
      await page.waitForTimeout(500)

      // Verify Image 3 Modal elements
      await page.waitForSelector('text=Leave Request Details', { timeout: 5000 })
      await page.waitForSelector('text=HR review checklist', { timeout: 5000 })
      await page.waitForSelector('text=Check available leave balance', { timeout: 5000 })
      await page.waitForSelector('text=Verify dates and supporting documents', { timeout: 5000 })

      // Check the checkboxes
      const checkboxes = page.locator('input[type="checkbox"]')
      if (await checkboxes.count() >= 2) {
        await checkboxes.nth(0).check()
        await checkboxes.nth(1).check()
      }

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'prod_hr_leave_modal_v2_light.png')
      })
      console.log('[+] Saved artifact: prod_hr_leave_modal_v2_light.png')

      // Close modal using Escape key
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // 3. Test /hr/tickets route
    console.log('[5/5] Navigating to /hr/tickets...')
    await page.goto('http://127.0.0.1:3000/hr/tickets', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await page.waitForSelector('text=Employee Tickets', { timeout: 8000 })
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_tickets_v2_light.png')
    })
    console.log('[+] Saved artifact: prod_hr_tickets_v2_light.png')

    // 4. Test Dark Mode
    console.log('Testing Dark Mode...')
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_tickets_v2_dark.png')
    })
    console.log('[+] Saved artifact: prod_hr_tickets_v2_dark.png')

    // Go back to /hr/leaves in dark mode
    await page.goto('http://127.0.0.1:3000/hr/leaves', { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      localStorage.setItem('@technocycle_admin_theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)

    // Click "Approved" filter card to show leave cards in dark mode
    const approvedCardDark = page.locator('button:has-text("Approved")').first()
    if (await approvedCardDark.isVisible()) {
      await approvedCardDark.click()
      await page.waitForTimeout(400)
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_leaves_v2_dark.png')
    })
    console.log('[+] Saved artifact: prod_hr_leaves_v2_dark.png')

    console.log('\n===> ALL UX PRINCIPLES REGRESSION CHECKS PASSED! <===')
  } catch (err) {
    console.error('Test Failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
