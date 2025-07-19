#!/usr/bin/env node

/**
 * Simple hydration check script using puppeteer
 * Starts the dev server, opens the page, and checks for hydration errors
 */

const { spawn } = require('child_process')
const puppeteer = require('puppeteer')

const PORT = 3001
const APP_URL = `http://localhost:${PORT}`

async function checkHydration() {
  console.log('🚀 Starting development server...')
  
  // Start Next.js dev server
  const server = spawn('npm', ['run', 'dev', '--', '--port', PORT], {
    stdio: 'pipe',
    detached: false
  })
  
  // Wait for server to start
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'))
    }, 30000)
    
    server.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(output.trim())
      if (output.includes('Ready') || output.includes(`localhost:${PORT}`)) {
        clearTimeout(timeout)
        resolve()
      }
    })
    
    server.stderr.on('data', (data) => {
      console.error(data.toString())
    })
  })
  
  console.log('🌐 Server started, launching browser...')
  
  // Launch browser and check for hydration errors
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  // Collect console errors
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  
  // Collect page errors
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  
  try {
    console.log(`📄 Loading ${APP_URL}...`)
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 })
    
    // Wait a bit for hydration to complete
    await page.waitForTimeout(2000)
    
    // Check for hydration errors
    const hydrationErrors = [...consoleErrors, ...pageErrors].filter(error =>
      error.toLowerCase().includes('hydrat') ||
      error.toLowerCase().includes('server rendered html') ||
      error.toLowerCase().includes('client properties')
    )
    
    if (hydrationErrors.length > 0) {
      console.error('❌ Hydration errors detected:')
      hydrationErrors.forEach(error => {
        console.error(`  - ${error}`)
      })
      process.exit(1)
    } else {
      console.log('✅ No hydration errors detected!')
    }
    
    // Check that key elements rendered
    const sendButton = await page.$('[data-testid="send-button"], button:has-text("Send")')
    const apiKeyButton = await page.$('button:has-text("Demo Key"), button:has-text("No API Key")')
    
    if (!sendButton) {
      console.warn('⚠️  Send button not found - might be a rendering issue')
    }
    if (!apiKeyButton) {
      console.warn('⚠️  API key button not found - might be a rendering issue')
    }
    
    if (sendButton && apiKeyButton) {
      console.log('✅ Key UI elements rendered successfully')
    }
    
  } catch (error) {
    console.error('❌ Error during browser check:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
    server.kill('SIGTERM')
    
    // Give server time to shutdown
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Interrupted, cleaning up...')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('🛑 Terminated, cleaning up...')
  process.exit(1)
})

checkHydration().catch((error) => {
  console.error('❌ Hydration check failed:', error.message)
  process.exit(1)
})