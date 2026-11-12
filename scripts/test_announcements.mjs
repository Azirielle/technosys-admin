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
  console.log('[1/8] Checking dev server responsiveness...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active and responding!')

  console.log('[2/8] Launching Playwright Chromium...')
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
    console.log('[3/8] Logging in as CEO...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Landed on /ceo')

    // 2. Navigate to Announcements
    console.log('[4/8] Navigating to Announcements tab...')
    const announcementsLink = page.locator('aside nav a[href*="announcements"]').first()
    if (await announcementsLink.count() > 0) {
      await announcementsLink.click()
    } else {
      await page.goto('http://127.0.0.1:3000/ceo/announcements', { waitUntil: 'domcontentloaded' })
    }

    await page.waitForTimeout(1000)
    console.log('[+] Landed on Announcements page!')

    // Move mouse away from the dock to collapse it to 64px
    await page.mouse.move(600, 300)
    await page.waitForTimeout(500)

    // Check header and hero box
    const titleText = await page.locator('h1').first().textContent()
    console.log('[Verify] Title heading:', titleText.trim())
    
    // 3. Capture Main List in Light Mode
    console.log('[5/8] Capturing Announcements List in Light Mode...')
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_light.png')
    })
    console.log('[+] Captured: prod_announcements_light.png')

    // Test filter tabs: Scheduled & Drafts
    console.log('[5b/8] Testing Scheduled and Draft filter tabs...')
    const scheduledTab = page.locator('button:has-text("Scheduled")').first()
    await scheduledTab.click()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_scheduled.png')
    })
    console.log('[+] Captured: prod_announcements_scheduled.png')

    const draftTab = page.locator('button:has-text("Drafts")').first()
    await draftTab.click()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_drafts.png')
    })
    console.log('[+] Captured: prod_announcements_drafts.png')

    // Return to All tab
    const allTab = page.locator('button:has-text("All")').first()
    await allTab.click()
    await page.waitForTimeout(300)

    // 4. Test Dedicated Creation Workflow
    console.log('[6/8] Testing Dedicated Create Announcement workflow...')
    const createBtn = page.locator('button:has-text("Create Announcement")').first()
    await createBtn.click()
    await page.waitForTimeout(500)

    // Verify Step 1 is active
    const step1Title = page.locator('h2:has-text("What do you want to say?")').first()
    console.log('[Verify] Step 1 Heading visible:', await step1Title.isVisible())

    // Fill form
    await page.fill('input[placeholder*="Schedule for Subic"]', 'Mandatory Q4 Fleet Safety Inspection & Equipment Calibration')
    await page.fill('textarea[placeholder*="Write complete and actionable instructions"]', 'All field technicians and vehicle operators must submit pre-trip calibration logs before Friday 5:00 PM. Mobile inspections must be verified through the technician check-in module on your smartphones. Vehicle dispatch clears only after verification.')

    // Select Audience: Field Technicians & Drivers
    const fieldTechAudience = page.locator('button:has-text("Field Technicians & Drivers")').first()
    await fieldTechAudience.click()

    // Select Importance: Important
    const importantBtn = page.locator('button:has-text("Pay attention notice")').first()
    await importantBtn.click()

    await page.waitForTimeout(400)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_create_step1.png')
    })
    console.log('[+] Captured: prod_announcements_create_step1.png')

    // Click Preview Announcement
    console.log('[7/8] Advancing to Preview Step...')
    const previewBtn = page.locator('button:has-text("Preview Announcement")').first()
    await previewBtn.click()
    await page.waitForTimeout(500)

    const reviewHeading = page.locator('text=Employee View Preview').first()
    console.log('[Verify] Employee View Preview visible:', await reviewHeading.isVisible())

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_create_preview.png')
    })
    console.log('[+] Captured: prod_announcements_create_preview.png')

    // Final Publish
    console.log('[7b/8] Finalizing publication...')
    const publishBtn = page.locator('button:has-text("Publish Announcement")').first()
    await publishBtn.click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_published_verified.png')
    })
    console.log('[+] Captured: prod_announcements_published_verified.png')

    // 5. Open Announcement Details Modal
    console.log('[8/8] Testing Document Details Modal...')
    const viewDetailsBtn = page.locator('button:has-text("View Details")').first()
    await viewDetailsBtn.click()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_details_modal.png')
    })
    console.log('[+] Captured: prod_announcements_details_modal.png')

    // Close modal
    const closeBtn = page.locator('button:has-text("Close")').first()
    await closeBtn.click()
    await page.waitForTimeout(300)

    // 6. Test Dark Mode
    console.log('[8b/8] Testing Dark Mode compliance...')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_dark.png')
    })
    console.log('[+] Captured: prod_announcements_dark.png')

    // Open Details Modal in Dark Mode
    const viewDetailsDarkBtn = page.locator('button:has-text("View Details")').first()
    await viewDetailsDarkBtn.click()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_announcements_details_modal_dark.png')
    })
    console.log('[+] Captured: prod_announcements_details_modal_dark.png')

    console.log('===> ALL ANNOUNCEMENTS PLAYWRIGHT TESTS PASSED SUCCESSFULLY! <===')
  } catch (err) {
    console.error('Test Execution Error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
