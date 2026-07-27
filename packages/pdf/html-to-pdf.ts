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
 * @sparticuz/chromium picks which native library bundle to unpack — al2.tar.br or
 * al2023.tar.br — purely by sniffing AWS_EXECUTION_ENV / AWS_LAMBDA_JS_RUNTIME /
 * CODEBUILD_BUILD_IMAGE. Vercel Functions set NONE of them, so both of its checks
 * return false: no lib pack is extracted and LD_LIBRARY_PATH is never set. Chromium
 * then dies with "libnss3.so: cannot open shared object file".
 *
 * Vercel Functions on Node 20+ run on Amazon Linux 2023, so we advertise the runtime
 * the library recognises for that lib pack. It only string-matches "20.x"/"22.x", so
 * we pass a recognised token rather than the literal running version — a Node 24 bump
 * would otherwise silently fall through both branches and regress to this same bug.
 *
 * MUST run before the dynamic import: the package wires LD_LIBRARY_PATH at module
 * load time, so setting this afterwards is too late.
 */
function ensureLambdaRuntimeHint(): void {
  if (!process.env.VERCEL) return;
  if (process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_JS_RUNTIME) return;
  if (Number(process.versions.node.split('.')[0]) < 20) return;
  process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x';
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
  ensureLambdaRuntimeHint();
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

  ensureLambdaRuntimeHint();
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
