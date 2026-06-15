// apps/web/lib/contracts/contract-pdf.ts
//
// Render a merged contract (HTML) to a PDF Buffer. The actual react-pdf rendering
// lives in @repo/pdf (renderContractReport) — rendering react-pdf from app code in
// the Next server bundle throws "Minified React error #31" in production, so it
// must run from the package, alongside the app's other working react-pdf reports.

import { renderContractReport } from '@repo/pdf';

// Letterhead logo. Any file under apps/web/public/logos/ can be used — swap the
// name here. Fetched from the app's own public URL so it doesn't need bundling.
const LOGO_FILE = 'logo_transparent_background.png';

/** Best-effort logo fetch; a failure must never block contract generation. */
async function loadLogo(): Promise<Buffer | undefined> {
  try {
    // Only trust an https app URL; a dev 'localhost' value would fail in serverless.
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    const base = envUrl && envUrl.startsWith('https://') ? envUrl : 'https://app.timkilroy.com';
    const res = await fetch(`${base}/logos/${encodeURIComponent(LOGO_FILE)}`);
    if (!res.ok) return undefined;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

/**
 * Render the merged contract HTML to a PDF buffer. The HTML keeps Firma anchors
 * ({{sig_*}}, {{date_*}}, {{init_*}}) as literal selectable text for Firma to bind.
 */
export async function renderContractPdf(mergedHtml: string): Promise<Buffer> {
  const logo = await loadLogo();
  return renderContractReport(mergedHtml, logo);
}
