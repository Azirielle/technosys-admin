import { spawn } from 'child_process'
import http from 'http'
import path from 'path'

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true)
        } else {
          retry()
        }
      })
      req.on('error', () => retry())
    }

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for server at ${url} after ${timeoutMs}ms`))
      } else {
        setTimeout(check, 1000)
      }
    }

    check()
  })
}

async function main() {
  console.log('--- Starting Next.js Dev Server for Verification on port 3001 ---')
  const nextProcess = spawn(
    'node',
    ['--max-old-space-size=4096', './node_modules/next/dist/bin/next', 'dev', '-p', '3001'],
    {
      cwd: path.resolve('Admin-side'),
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: '3001' }
    }
  )

  nextProcess.stdout.on('data', (d) => {
    const str = d.toString()
    if (str.includes('Ready in') || str.includes('started server on') || str.includes('Local:')) {
      console.log(`[Next.js stdout]: ${str.trim()}`)
    }
  })

  nextProcess.stderr.on('data', (d) => {
    const str = d.toString()
    if (str.includes('Error') || str.includes('warn')) {
      console.error(`[Next.js stderr]: ${str.trim()}`)
    }
  })

  try {
    console.log('Waiting for Next.js to be ready on http://localhost:3001/login...')
    await waitForServer('http://localhost:3001/login', 60000)
    console.log('[+] Server is ready! Launching test_ceo_playwright.mjs...')

    // Run test_ceo_playwright.mjs
    const { runSuite } = await import('./test_ceo_playwright_fn.mjs')
    await runSuite()
    console.log('--- Suite Verification Completed Successfully ---')
  } finally {
    console.log('Terminating Next.js dev server...')
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', nextProcess.pid.toString(), '/f', '/t'], { shell: true })
    } else {
      nextProcess.kill('SIGTERM')
    }
  }
}

main().catch((err) => {
  console.error('Test suite failed:', err)
  process.exit(1)
})
