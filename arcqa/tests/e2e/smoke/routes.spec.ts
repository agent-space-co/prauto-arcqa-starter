import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * ArcQA — Route smoke tests.
 *
 * CUSTOMIZE THIS FILE:
 * 1. Replace AUTHED_ROUTES with the protected routes in your app.
 * 2. Replace PUBLIC_ROUTES with routes that should work without auth.
 * 3. Adjust HARD_ERROR_PATTERNS if your framework uses different error strings.
 *
 * Assertions are minimal: no 5xx errors, page title present, no crash banners.
 * Unauthenticated redirects to /login are acceptable (not a failure).
 */

const AUTH_FILE = path.join(__dirname, '../.auth/user.json')

function hasValidAuth(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

// ── Edit these to match your app's routes ─────────────────────────────────
const AUTHED_ROUTES: string[] = [
  '/dashboard',
  '/settings',
  // Add more protected routes here
]

const PUBLIC_ROUTES: string[] = [
  '/login',
  // Add more public routes here
]
// ──────────────────────────────────────────────────────────────────────────

const HARD_ERROR_PATTERNS = [
  'Application error',
  'Internal Server Error',
  'An error occurred in the Server Components render',
  'Unhandled Runtime Error',
]

test.describe('Route smoke tests', () => {
  test.describe('Public routes', () => {
    for (const route of PUBLIC_ROUTES) {
      test(`GET ${route} — no 5xx`, async ({ page }) => {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
        expect(response, `No response from ${route}`).not.toBeNull()
        expect(response!.status()).toBeLessThan(500)

        const title = await page.title()
        expect(title.length).toBeGreaterThan(0)

        const body = await page.content()
        for (const pattern of HARD_ERROR_PATTERNS) {
          expect(body).not.toContain(pattern)
        }
      })
    }
  })

  test.describe('Authenticated routes', () => {
    test.beforeEach(async ({}, testInfo) => {
      if (!hasValidAuth()) {
        testInfo.skip(true, 'E2E_SESSION_TOKEN not set — skipping authenticated route test')
      }
    })

    for (const route of AUTHED_ROUTES) {
      test(`GET ${route} — no 5xx`, async ({ page }) => {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded' })

        if (page.url().includes('/login')) return   // auth redirect is fine

        expect(response, `No response from ${route}`).not.toBeNull()
        expect(response!.status()).toBeLessThan(500)

        const title = await page.title()
        expect(title.length).toBeGreaterThan(0)

        const body = await page.content()
        for (const pattern of HARD_ERROR_PATTERNS) {
          expect(body).not.toContain(pattern)
        }
      })
    }
  })
})
