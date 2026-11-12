import http from 'http'
import { chromium } from 'playwright'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/36100423-6b6a-4aa2-8ef7-cc4a5b271cc7'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Login
    console.log('[1/4] Logging in...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ceo**', { timeout: 30000 })

    // 2. Open /hr
    console.log('[2/4] Navigating to /hr...')
    await page.goto('http://127.0.0.1:3000/hr', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Ensure light mode
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await page.waitForTimeout(200)

    // 3. Test Ticket Selection
    console.log('[3/4] Clicking first ticket card on the left...')
    const firstTicket = page.locator('h4:has-text("Leave Filing: Sick Leave")').first()
    await firstTicket.click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_ticket_selected_light.png')
    })
    console.log('[+] Saved artifact: prod_hr_ticket_selected_light.png')

    // 4. Test Leave Requests - All Requests & Detail Modal
    console.log('[4/4] Switching to Leave Requests & testing modal...')
    await page.click('button:has-text("Leave Requests")')
    await page.waitForTimeout(500)

    // Click "All requests" filter pill
    const allRequestsPill = page.locator('button:has-text("All requests")').first()
    await allRequestsPill.click()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_hr_leaves_cards_light.png')
    })
    console.log('[+] Saved artifact: prod_hr_leaves_cards_light.png')

    // Click "View application" on the first card
    const viewAppBtn = page.locator('button:has-text("View application")').first()
    if (await viewAppBtn.isVisible()) {
      await viewAppBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'prod_hr_leave_modal_light.png')
      })
      console.log('[+] Saved artifact: prod_hr_leave_modal_light.png')
    }

    console.log('\n===> INTERACTION TESTS COMPLETE! <===')
  } catch (err) {
    console.error('Interaction Test Error:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
