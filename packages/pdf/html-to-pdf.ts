/**
 * HTML to PDF converter
 * Uses Puppeteer with dynamic imports to avoid breaking when Chromium is unavailable.
 * Falls back gracefully in serverless environments where Chromium can't launch.
 */

export interface PdfOptions {
  format?: 'Letter' | 'A4';
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Convert HTML string to PDF buffer using Puppeteer (dynamic import)
 */
export async function htmlToPdf(
  html: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const {
    format = 'Letter',
    printBackground = true,
    margin = { top: '0', right: '0', bottom: '0', left: '0' },
  } = options;

  // Dynamic imports — prevents module-level crash if packages are missing
  const puppeteer = (await import('puppeteer-core')).default;
  const chromium = (await import('@sparticuz/chromium')).default;

  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0', // Wait for fonts and resources to load
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format,
      printBackground,
      margin,
      preferCSSPageSize: true, // Use CSS @page settings
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Convert HTML file to PDF buffer
 */
export async function htmlFileToPdf(
  filePath: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const {
    format = 'Letter',
    printBackground = true,
    margin = { top: '0', right: '0', bottom: '0', left: '0' },
  } = options;

  const puppeteer = (await import('puppeteer-core')).default;
  const chromium = (await import('@sparticuz/chromium')).default;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Navigate to file
    await page.goto(`file://${filePath}`, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format,
      printBackground,
      margin,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
