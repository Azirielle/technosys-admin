import { chromium } from 'playwright'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/36100423-6b6a-4aa2-8ef7-cc4a5b271cc7'
const HTML_FILE_URI = `file:///${ARTIFACT_DIR.replace(/\\/g, '/')}/ceo_minimalist_hub.html`

async function run() {
  console.log('[1/5] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }
  })
  const page = await context.newPage()

  try {
    console.log(`[2/5] Navigating to ${HTML_FILE_URI}...`)
    await page.goto(HTML_FILE_URI, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    // 1. Capture clean baseline with transparent logo and clean dept cards
    const defaultImg = path.join(ARTIFACT_DIR, 'ceo_refined_default.png')
    await page.screenshot({ path: defaultImg, fullPage: true })
    console.log(`[+] Captured: ${defaultImg}`)

    // 2. Open Modal (Service Dept tab active)
    console.log('[3/5] Opening Modal on Service Dept...')
    await page.click('button:has-text("Delegate Department Coverage")')
    await page.waitForTimeout(300)

    const modalImg1 = path.join(ARTIFACT_DIR, 'ceo_refined_modal_service.png')
    await page.screenshot({ path: modalImg1, fullPage: true })
    console.log(`[+] Captured Service Dept Modal: ${modalImg1}`)

    // 3. Switch to Accountant tab, check Payroll, verifying cumulative counter
    console.log('[4/5] Testing multi-department cumulative selection...')
    await page.click('#tab-btn-accountant')
    await page.waitForTimeout(200)
    await page.click('#card-mod-audit') // check Accountant audit
    await page.waitForTimeout(200)

    const modalImg2 = path.join(ARTIFACT_DIR, 'ceo_refined_modal_cumulative.png')
    await page.screenshot({ path: modalImg2, fullPage: true })
    console.log(`[+] Captured Cumulative Multi-Dept Modal: ${modalImg2}`)

    // Close modal
    await page.click('#delegation-modal .btn-close-modal')
    await page.waitForTimeout(200)

    // 4. Toggle Luxury Slate Dark Mode
    console.log('[5/5] Toggling Slate Dark Mode...')
    await page.click('button[title="Toggle Dark/Light Mode"]')
    await page.waitForTimeout(400)

    const darkImg = path.join(ARTIFACT_DIR, 'ceo_refined_dark.png')
    await page.screenshot({ path: darkImg, fullPage: true })
    console.log(`[+] Captured Luxury Slate Dark Mode: ${darkImg}`)

    console.log('\n[PASS] All CEO Refined Prototype screenshots captured successfully!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
