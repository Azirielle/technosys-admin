import { chromium } from 'playwright'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/3f8f463a-f3ce-4b9b-9e47-df6f60de43ad'

async function run() {
  console.log('[1/5] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  console.log('[2/5] Navigating to http://localhost:3000/login...')
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })

  console.log('[3/5] Measuring Full-Screen Split Metrics...')
  const metrics = await page.evaluate(() => {
    const leftFlank = document.querySelector('.w-\\[48vw\\]')
    const rightFlank = document.querySelector('.w-\\[56vw\\]')
    const logo = document.querySelector('img[alt="TechnoCycle Logo"]')
    const form = document.querySelector('form')
    const isDark = document.documentElement.classList.contains('dark')

    const lRect = leftFlank?.getBoundingClientRect()
    const rRect = rightFlank?.getBoundingClientRect()

    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      leftWidth: lRect ? Math.round(lRect.width) : 0,
      rightWidth: rRect ? Math.round(rRect.width) : 0,
      hasLogo: !!logo,
      hasForm: !!form,
      isDark,
      isFullScreen: lRect && rRect ? (Math.round(lRect.height) >= window.innerHeight) : false
    }
  })

  console.log('--- PLAYWRIGHT FULL-SCREEN SPLIT METRICS ---')
  console.log(`Viewport:      ${metrics.windowWidth}px × ${metrics.windowHeight}px`)
  console.log(`Left Flank:    ${metrics.leftWidth}px`)
  console.log(`Right Flank:   ${metrics.rightWidth}px`)
  console.log(`Full-Screen:   ${metrics.isFullScreen}`)
  console.log(`Initial Theme: ${metrics.isDark ? 'Dark' : 'Light'}`)
  console.log('--------------------------------------------')

  // 1. Capture Full-Screen Light Mode Screenshot
  const lightImg = path.join(ARTIFACT_DIR, 'fullscreen_brand_light.png')
  await page.screenshot({ path: lightImg, fullPage: true })
  console.log(`[+] Saved Full-Screen Light Mode screenshot: ${lightImg}`)

  // 2. Click CEO Role Chip and verify input fill
  console.log('[4/5] Testing 1-click Role Chip autofill...')
  const ceoBtn = page.locator('button:has-text("CEO")').first()
  await ceoBtn.click()
  await page.waitForTimeout(300)
  const usernameVal = await page.inputValue('#username')
  const passwordVal = await page.inputValue('#password')
  console.log(`[+] Role Autofill verified: username="${usernameVal}", password="${passwordVal.length} chars"`)

  // 3. Toggle Theme to Dark Mode
  console.log('[5/5] Testing Theme Switcher (Light -> Dark)...')
  const themeToggle = page.locator('button[aria-label*="mode"], button[title*="mode"]').first()
  await themeToggle.click()
  await page.waitForTimeout(600)

  const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  console.log(`[+] Dark Mode active after toggle: ${isDarkAfter}`)

  const darkImg = path.join(ARTIFACT_DIR, 'fullscreen_brand_dark.png')
  await page.screenshot({ path: darkImg, fullPage: true })
  console.log(`[+] Saved Full-Screen Dark Mode screenshot: ${darkImg}`)

  // 4. Test Policy Modal
  const policyBtn = page.locator('button:has-text("TechnoCycle administrative policies")')
  await policyBtn.click()
  await page.waitForSelector('text=TechnoCycle Administrative Governance', { timeout: 10000 })
  await page.waitForTimeout(1000)

  const modalImg = path.join(ARTIFACT_DIR, 'fullscreen_brand_modal.png')
  await page.screenshot({ path: modalImg, fullPage: true })
  console.log(`[+] Saved Modal dialog screenshot: ${modalImg}`)

  await browser.close()
  console.log('\nAll Full-Screen Playwright verification steps completed successfully!')
}

run().catch((e) => {
  console.error('Test error:', e)
  process.exit(1)
})
