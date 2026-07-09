import * as cheerio from "cheerio";
import { normalizeUrl } from "@/lib/wah-wah/extract";
import type { AgencyBrand } from "@repo/prompts";

function absolutize(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

const HEX = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;

export function extractBrand(html: string, baseUrl: string): AgencyBrand {
  const $ = cheerio.load(html);
  const colors: string[] = [];

  const themeColor = $('meta[name="theme-color"]').attr("content")?.trim();
  if (themeColor && HEX.test(themeColor)) colors.push(themeColor);

  // Sweep inline style attributes for the most common brand hex values.
  $("[style]").each((_, el) => {
    const m = ($(el).attr("style") || "").match(HEX);
    if (m && !colors.includes(m[0])) colors.push(m[0]);
  });

  // Logo preference: og:image (usually a real logo/brand image) then favicon.
  const og = $('meta[property="og:image"]').attr("content")?.trim();
  const icon =
    $('link[rel="icon"]').attr("href")?.trim() ||
    $('link[rel="shortcut icon"]').attr("href")?.trim() ||
    $('link[rel="apple-touch-icon"]').attr("href")?.trim();

  const logoRaw = og || icon || null;
  const logoUrl = logoRaw ? absolutize(logoRaw, baseUrl) : null;

  const siteName =
    $('meta[property="og:site_name"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    null;

  return { colors: colors.slice(0, 5), logoUrl, name: siteName };
}

const MAX_REDIRECTS = 5;

export async function fetchBrand(url: string): Promise<AgencyBrand> {
  const safe = normalizeUrl(url); // intentionally outside try/catch: SSRF guard must throw
  try {
    // Redirects are followed manually so every hop re-passes the
    // private-host guard — redirect: "follow" would let a public URL
    // bounce the server into internal addresses (SSRF).
    let current = safe;
    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const res = await fetch(current, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10_000),
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) break;
        // Re-run the SSRF guard on every redirect hop.
        current = normalizeUrl(new URL(location, current).toString());
        continue;
      }
      if (!res.ok) return { colors: [], logoUrl: null, name: null };
      const html = await res.text();
      return extractBrand(html, current); // resolve logo against the FINAL hop URL
    }
    return { colors: [], logoUrl: null, name: null };
  } catch {
    return { colors: [], logoUrl: null, name: null };
  }
}
