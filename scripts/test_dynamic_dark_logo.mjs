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
    console.error('Server is not responding on http://127.0.0.1:3000/login.')
    process.exit(1)
  }
  console.log('[+] Dev server is active and responding!')

  console.log('[2/5] Launching Playwright Chromium...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Login as CEO
    console.log('[3/5] Logging in as CEO...')
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
    await page.fill('#username', 'CEO')
    await page.fill('#password', 'CEO123')
    await page.waitForTimeout(200)

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForURL('**/ceo**', { timeout: 30000 })
    console.log('[+] Landed on /ceo dashboard')

    // Ensure we are initially in light mode
    const isInitiallyDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (isInitiallyDark) {
      console.log('Initially dark, clicking toggle to reset to light mode...')
      await page.locator('#btn-theme-toggle').click()
      await page.waitForTimeout(400)
    }

    // Move mouse away to keep dock collapsed at 64px
    await page.mouse.move(600, 300)
    await page.waitForTimeout(500)

    // 2. LIGHT MODE AUDIT
    console.log('\n--- LIGHT MODE AUDIT ---')
    const lightLogoImg = page.locator('aside.group\\/dock img[alt="TechnoCycle Logo"]').first()
    const lightLogoSrc = await lightLogoImg.getAttribute('src')
    console.log('Light Mode Logo Src:', lightLogoSrc)
    if (!lightLogoSrc.includes('technocycle_logo_cutout.png')) {
      throw new Error(`Expected light logo src to contain technocycle_logo_cutout.png, got: ${lightLogoSrc}`)
    }

    const dockBoxLight = await page.locator('aside.group\\/dock').first().boundingBox()
    const logoBoxLight = await lightLogoImg.boundingBox()
    const homeIconBoxLight = await page.locator('aside.group\\/dock a[href="/ceo"] svg').first().boundingBox()

    const dockCenterLight = dockBoxLight.x + dockBoxLight.width / 2
    const logoCenterLight = logoBoxLight.x + logoBoxLight.width / 2
    const homeCenterLight = homeIconBoxLight.x + homeIconBoxLight.width / 2
    const lightDelta = Math.abs(logoCenterLight - homeCenterLight)

    console.log(`  Dock Center X:       ${dockCenterLight.toFixed(2)}px`)
    console.log(`  Logo Center X:       ${logoCenterLight.toFixed(2)}px`)
    console.log(`  Home Icon Center X:  ${homeCenterLight.toFixed(2)}px`)
    console.log(`  Alignment Delta:     ${lightDelta.toFixed(2)}px`)

    // Screenshot of Light Mode dock
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_logo_light_mode_verified.png')
    })
    console.log('[+] Saved artifact: prod_logo_light_mode_verified.png')

    // 3. TOGGLE TO DARK MODE
    console.log('\n--- TOGGLING TO DARK MODE ---')
    // Hover over dock to click toggle cleanly
    await page.locator('aside.group\\/dock').first().hover()
    await page.waitForTimeout(300)
    await page.locator('#btn-theme-toggle').click()
    await page.waitForTimeout(600)

    // Move mouse away so dock returns to collapsed state
    await page.mouse.move(600, 300)
    await page.waitForTimeout(500)

    const isNowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log('document.documentElement has .dark:', isNowDark)

    const darkLogoImg = page.locator('aside.group\\/dock img[alt="TechnoCycle Logo"]').first()
    const darkLogoSrc = await darkLogoImg.getAttribute('src')
    console.log('Dark Mode Logo Src:', darkLogoSrc)
    if (!darkLogoSrc.includes('technocycle_logo_dark_cutout.png')) {
      throw new Error(`Expected dark logo src to contain technocycle_logo_dark_cutout.png, got: ${darkLogoSrc}`)
    }

    const dockBoxDark = await page.locator('aside.group\\/dock').first().boundingBox()
    const logoBoxDark = await darkLogoImg.boundingBox()
    const homeIconBoxDark = await page.locator('aside.group\\/dock a[href="/ceo"] svg').first().boundingBox()

    const dockCenterDark = dockBoxDark.x + dockBoxDark.width / 2
    const logoCenterDark = logoBoxDark.x + logoBoxDark.width / 2
    const homeCenterDark = homeIconBoxDark.x + homeIconBoxDark.width / 2
    const darkDelta = Math.abs(logoCenterDark - homeCenterDark)

    console.log(`  Dock Center X:       ${dockCenterDark.toFixed(2)}px`)
    console.log(`  Dark Logo Center X:  ${logoCenterDark.toFixed(2)}px`)
    console.log(`  Home Icon Center X:  ${homeCenterDark.toFixed(2)}px`)
    console.log(`  Alignment Delta:     ${darkDelta.toFixed(2)}px`)

    // Screenshot of Dark Mode collapsed dock
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_logo_dark_mode_verified.png')
    })
    console.log('[+] Saved artifact: prod_logo_dark_mode_verified.png')

    // Expand dock in dark mode and take screenshot
    await page.locator('aside.group\\/dock').first().hover()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod_dock_dark_mode_expanded.png')
    })
    console.log('[+] Saved artifact: prod_dock_dark_mode_expanded.png')

    // 4. TOGGLE BACK TO LIGHT MODE
    console.log('\n--- TOGGLING BACK TO LIGHT MODE ---')
    await page.locator('#btn-theme-toggle').click()
    await page.waitForTimeout(500)
    await page.mouse.move(600, 300)
    await page.waitForTimeout(400)

    const revertedLogoSrc = await page.locator('aside.group\\/dock img[alt="TechnoCycle Logo"]').first().getAttribute('src')
    console.log('Reverted Logo Src:', revertedLogoSrc)
    if (!revertedLogoSrc.includes('technocycle_logo_cutout.png')) {
      throw new Error(`Expected reverted logo to be light cutout, got: ${revertedLogoSrc}`)
    }

    console.log('\n===> DYNAMIC DARK/LIGHT LOGO VERIFICATION PASSED WITH ZERO FLAWS! <===')
  } catch (err) {
    console.error('Test Failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
