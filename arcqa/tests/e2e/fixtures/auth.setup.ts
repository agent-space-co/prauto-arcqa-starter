import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * ArcQA auth setup fixture.
 *
 * Injects a session cookie directly using E2E_SESSION_TOKEN so CI can run
 * authenticated tests without going through the OAuth login flow.
 *
 * If E2E_SESSION_TOKEN is not set, writes empty auth state and all
 * authenticated tests skip gracefully via their own beforeEach checks.
 *
 * Customize: change the cookie name and domain logic to match your auth provider.
 */

const AUTH_FILE = path.join(__dirname, '../.auth/user.json')

setup('authenticate', async ({ page }) => {
  const sessionToken = process.env.E2E_SESSION_TOKEN
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const cookieDomain = new URL(baseUrl).hostname

  if (!sessionToken) {
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }, null, 2))
    console.log('[arcqa] E2E_SESSION_TOKEN not set — writing empty auth state; authenticated tests will skip')
    return
  }

  // ── Customize this block for your auth provider ──────────────────────────
  // Example below uses a Supabase cookie. Replace with your own cookie name
  // and value format.
  const supabaseUrl = process.env.SUPABASE_URL ?? 'http://localhost:54321'
  const supabaseHostname = new URL(supabaseUrl).hostname
  const cookieName = `sb-${supabaseHostname.replace(/\./g, '-')}-auth-token`
  // ─────────────────────────────────────────────────────────────────────────

  await page.context().addCookies([{
    name: cookieName,
    value: sessionToken,
    domain: cookieDomain,
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }])

  await page.goto('/')
  if (page.url().includes('/login')) {
    console.warn('[arcqa] Auth cookie did not produce a valid session — check E2E_SESSION_TOKEN')
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }, null, 2))
    return
  }

  await page.context().storageState({ path: AUTH_FILE })
  console.log('[arcqa] Auth state saved to', AUTH_FILE)
})
