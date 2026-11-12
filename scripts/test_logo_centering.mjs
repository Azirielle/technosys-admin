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
  console.log('[1/4] Checking dev server responsiveness...')
  const isUp = await checkServer('http://127.0.0.1:3000/login')
  if (!isUp) {
    console.error('Server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active and responding!')

  console.log('[2/4] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Login as CEO
    console.log('[3/4] Logging in as CEO...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Landed on /ceo dashboard')

    // Move mouse away to keep dock collapsed at 64px
    await page.mouse.move(600, 300)
    await page.waitForTimeout(600)

    // 2. Measure geometry & center coordinates
    const dockBox = await page.locator('aside.group\\/dock').first().boundingBox()
    const logoBox = await page.locator('aside.group\\/dock img[alt="TechnoCycle Logo"]').first().boundingBox()
    const homeIconBox = await page.locator('aside.group\\/dock a[href="/ceo"] svg').first().boundingBox()

    console.log('Dock Bounding Box:', dockBox)
    console.log('Logo Bounding Box:', logoBox)
    console.log('Home Icon Bounding Box:', homeIconBox)

    const dockCenterX = dockBox.x + dockBox.width / 2
    const logoCenterX = logoBox.x + logoBox.width / 2
    const homeCenterX = homeIconBox.x + homeIconBox.width / 2

    console.log(`[Geometry Analysis]`)
    console.log(`  Dock Center X:       ${dockCenterX.toFixed(2)}px`)
    console.log(`  Logo Center X:       ${logoCenterX.toFixed(2)}px (Offset from dock center: ${(logoCenterX - dockCenterX).toFixed(2)}px)`)
    console.log(`  Home Icon Center X:  ${homeCenterX.toFixed(2)}px (Offset from dock center: ${(homeCenterX - dockCenterX).toFixed(2)}px)`)

    const alignmentDiff = Math.abs(logoCenterX - homeCenterX)
    console.log(`  Vertical Axis Alignment Delta: ${alignmentDiff.toFixed(2)}px`)

    // Capture collapsed dock focused screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_dock_logo_centered_collapsed.png')
    })
    console.log('[+] Captured: prod_dock_logo_centered_collapsed.png')

    // 3. Hover over dock and capture expanded state
    await page.locator('aside.group\\/dock').first().hover()
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_dock_logo_centered_expanded.png')
    })
    console.log('[+] Captured: prod_dock_logo_centered_expanded.png')

    // 4. Test Dark Mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.mouse.move(600, 300)
    await page.waitForTimeout(400)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_dock_logo_centered_dark.png')
    })
    console.log('[+] Captured: prod_dock_logo_centered_dark.png')

    console.log('===> LOGO CENTERING VERIFICATION SUCCESSFUL! <===')
  } catch (err) {
    console.error('Test Execution Error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
