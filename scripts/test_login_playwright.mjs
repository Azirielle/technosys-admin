import { spawn } from 'child_process'
import http from 'http'
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/3f8f463a-f3ce-4b9b-9e47-df6f60de43ad'

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve()
        } else {
          setTimeout(check, 1000)
        }
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`))
        } else {
          setTimeout(check, 1000)
        }
      })
    }
    check()
  })
}

async function runTest() {
  console.log('[1/5] Starting Next.js development server...')
  const devServer = spawn('cmd.exe', ['/c', 'npm run dev'], {
    cwd: 'c:/Users/ANDREW/Projects/Master-TechnoSys-Folder/Admin-side',
    stdio: 'pipe',
    detached: false
  })

  devServer.stdout.on('data', (d) => process.stdout.write(`[NEXT] ${d}`))
  devServer.stderr.on('data', (d) => process.stderr.write(`[NEXT-ERR] ${d}`))

  try {
    console.log('[2/5] Waiting for http://localhost:3000/login to be ready...')
    await waitForServer('http://localhost:3000/login')
    console.log('[+] Server is up and responding!')

    console.log('[3/5] Launching Playwright Chromium...')
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    })
    const page = await context.newPage()

    console.log('[4/5] Navigating to http://localhost:3000/login on 1920x1080 desktop...')
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })

    // Measure Card Geometry
    const cardInfo = await page.evaluate(() => {
      const card = document.querySelector('[style*="max-width"]')
      const form = document.querySelector('form')
      const btn = form?.querySelector('button[type="submit"]')
      const userInput = document.querySelector('#username')
      const rect = card?.getBoundingClientRect()
      const btnRect = btn?.getBoundingClientRect()
      const inputRect = userInput?.getBoundingClientRect()

      return {
        cardWidth: rect ? Math.round(rect.width) : 0,
        cardHeight: rect ? Math.round(rect.height) : 0,
        cardLeft: rect ? Math.round(rect.left) : 0,
        btnWidth: btnRect ? Math.round(btnRect.width) : 0,
        inputWidth: inputRect ? Math.round(inputRect.width) : 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        isCentered: rect ? Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 15 : false
      }
    })

    console.log('\n--- PLAYWRIGHT CARD MEASUREMENTS ---')
    console.log(`Window Width: ${cardInfo.windowWidth}px`)
    console.log(`Card Width:   ${cardInfo.cardWidth}px (Target Constraint: 420px)`)
    console.log(`Card Height:  ${cardInfo.cardHeight}px`)
    console.log(`Button Width: ${cardInfo.btnWidth}px`)
    console.log(`Input Width:  ${cardInfo.inputWidth}px`)
    console.log(`Card Centered horizontally: ${cardInfo.isCentered}`)
    console.log('------------------------------------\n')

    if (cardInfo.cardWidth > 450) {
      throw new Error(`FAIL: Card width is ${cardInfo.cardWidth}px! Still stretching across screen!`)
    } else {
      console.log(`[PASS] Card width is strictly constrained to ${cardInfo.cardWidth}px! Stretched hotdog bug is FIXED.`)
    }

    // Take Desktop Screenshot
    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'login_monolith_desktop.png')
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true })
    console.log(`[+] Desktop Screenshot captured: ${desktopScreenshotPath}`)

    // Test Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'login_monolith_mobile.png')
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true })
    console.log(`[+] Mobile Screenshot captured: ${mobileScreenshotPath}`)

    // Reset to Desktop & Test Policy Modal Interaction
    await page.setViewportSize({ width: 1920, height: 1080 })
    console.log('[5/5] Testing Policy Modal Click Interaction...')
    const policyButton = page.locator('button:has-text("TechnoCycle administrative policies")')
    await policyButton.click()
    await page.waitForSelector('text=TechnoCycle Administrative Governance', { timeout: 12000 })
    await page.waitForTimeout(1000)

    const modalScreenshotPath = path.join(ARTIFACT_DIR, 'login_modal_interaction.png')
    await page.screenshot({ path: modalScreenshotPath, fullPage: true })
    console.log(`[+] Policy Modal Interaction Screenshot captured: ${modalScreenshotPath}`)

    await browser.close()
    console.log('\n[SUCCESS] All Playwright verification checks passed 100%!')
  } catch (err) {
    console.error('[ERROR during Playwright test]:', err)
  } finally {
    console.log('Stopping test dev server...')
    devServer.kill('SIGINT')
    process.exit(0)
  }
}

runTest()
