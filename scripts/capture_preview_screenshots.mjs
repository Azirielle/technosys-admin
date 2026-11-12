import { chromium } from 'playwright'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/ANDREW/.gemini/antigravity/brain/36100423-6b6a-4aa2-8ef7-cc4a5b271cc7'
const HTML_FILE = `file:///${ARTIFACT_DIR}/ceo_overrides_preview.html`.replace(/\\/g, '/')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  console.log('Opening HTML prototype:', HTML_FILE)
  await page.goto(HTML_FILE, { waitUntil: 'load' })
  await page.waitForTimeout(500)

  // 1. Capture Default Clean State
  const defaultPath = path.join(ARTIFACT_DIR, 'ceo_html_preview_default.png')
  await page.screenshot({ path: defaultPath, fullPage: true })
  console.log('[+] Captured default preview:', defaultPath)

  // 1b. Capture Header Closeup for direct comparison
  const headerElem = page.locator('header.page-header')
  const headerPath = path.join(ARTIFACT_DIR, 'ceo_header_closeup.png')
  await headerElem.screenshot({ path: headerPath })
  console.log('[+] Captured header closeup:', headerPath)

  // 2. Open Modal
  const firstGrantBtn = page.locator('button.cell-ghost-target').first()
  await firstGrantBtn.click()
  await page.waitForTimeout(400)

  const modalPath = path.join(ARTIFACT_DIR, 'ceo_html_preview_modal.png')
  await page.screenshot({ path: modalPath, fullPage: true })
  console.log('[+] Captured modal preview:', modalPath)

  // 3. Click "Grant Override" inside modal to activate override
  const grantModalBtn = page.locator('#durationModal button:has-text("Grant Override")').first()
  await grantModalBtn.click()
  await page.waitForTimeout(400)

  // 4. Capture Active State with glowing pill and updated KPI
  const activePath = path.join(ARTIFACT_DIR, 'ceo_html_preview_active.png')
  await page.screenshot({ path: activePath, fullPage: true })
  console.log('[+] Captured active preview:', activePath)

  // 5. Click "Revoke Access" in dossier card to open Revoke Confirmation Modal
  const revokeDossierBtn = page.locator('.btn-revoke-action').first()
  await revokeDossierBtn.click()
  await page.waitForTimeout(400)

  const revokePath = path.join(ARTIFACT_DIR, 'ceo_html_preview_revoke.png')
  await page.screenshot({ path: revokePath, fullPage: true })
  console.log('[+] Captured revoke modal preview:', revokePath)

  // Close revoke modal
  await page.locator('#revokeModal button:has-text("Cancel")').click()
  await page.waitForTimeout(300)

  // 6. Test Quick Filter: Click "Human Resources"
  const hrFilterBtn = page.locator('button.filter-chip:has-text("Human Resources")')
  await hrFilterBtn.click()
  await page.waitForTimeout(400)

  const filterPath = path.join(ARTIFACT_DIR, 'ceo_html_preview_filtered.png')
  await page.screenshot({ path: filterPath, fullPage: true })
  console.log('[+] Captured filtered preview:', filterPath)

  await browser.close()
}

run().catch((err) => {
  console.error('Error capturing prototype:', err)
  process.exit(1)
})
