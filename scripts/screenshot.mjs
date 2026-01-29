#!/usr/bin/env node
/**
 * Take screenshots of deployment pages using Playwright.
 * Usage: node scripts/screenshot.mjs <base-url> [page-path]
 *
 * Examples:
 *   node scripts/screenshot.mjs https://app.vercel.app /growthos
 *   node scripts/screenshot.mjs https://app.vercel.app  # screenshots all key pages
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.argv[2];
if (!BASE_URL) {
  console.error('Usage: node scripts/screenshot.mjs <base-url> [page-path]');
  process.exit(1);
}

const specificPath = process.argv[3];
const outputDir = join(process.cwd(), 'screenshots');
mkdirSync(outputDir, { recursive: true });

const pages = specificPath
  ? [specificPath]
  : ['/growthos', '/growthos/assessment'];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const pagePath of pages) {
    const url = `${BASE_URL}${pagePath}`;
    const page = await context.newPage();

    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000); // let animations settle

      const filename = pagePath.replace(/\//g, '_').replace(/^_/, '') || 'home';
      const filepath = join(outputDir, `${filename}.png`);

      // Full page screenshot
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`  -> Saved: ${filepath}`);

      // Also capture console errors
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      if (errors.length > 0) {
        console.log(`  -> Console errors: ${errors.join('; ')}`);
      }
    } catch (err) {
      console.error(`  -> FAILED: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${outputDir}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
