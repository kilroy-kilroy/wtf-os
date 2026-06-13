import * as cheerio from "cheerio";

const MAX_BODY_CHARS = 12_000; // ~3K tokens; plenty for a homepage

export type ExtractedPage = {
  title: string;
  metaDescription: string;
  h1: string;
  bodyText: string;
};

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1)/i;

export function normalizeUrl(input: string): string {
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;
  const url = new URL(withProto);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  if (PRIVATE_HOST.test(url.hostname) || !url.hostname.includes(".")) {
    throw new Error("That doesn't look like a public website");
  }
  return url.toString();
}

export function extractPageText(html: string): ExtractedPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  return {
    title: $("title").first().text().trim(),
    metaDescription: $('meta[name="description"]').attr("content")?.trim() ?? "",
    h1: $("h1").first().text().trim(),
    bodyText: $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_BODY_CHARS),
  };
}

const MAX_REDIRECTS = 5;

export async function fetchPage(url: string): Promise<ExtractedPage> {
  // Redirects are followed manually so every hop re-passes the
  // private-host guard — redirect: "follow" would let a public URL
  // bounce the server into internal addresses.
  let current = url;
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const res = await fetch(current, {
      // Browser UA — bot-protection (Cloudflare etc.) 403s custom agents,
      // and the sites being fetched are ones their own users submitted.
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
      if (!location) {
        throw new Error(`Couldn't load that page (HTTP ${res.status})`);
      }
      current = normalizeUrl(new URL(location, current).toString());
      continue;
    }
    if (res.status === 403 || res.status === 503) {
      throw new Error(
        "That site's bot protection is blocking us. Try another page on the site, or ask whoever runs the site to allow it."
      );
    }
    if (!res.ok) {
      throw new Error(`Couldn't load that page (HTTP ${res.status})`);
    }
    const html = await res.text();
    return extractPageText(html);
  }
  throw new Error("Too many redirects — that site can't make up its mind");
}
