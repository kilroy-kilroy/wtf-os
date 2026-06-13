import { describe, it, expect, vi, afterEach } from "vitest";
import { extractPageText, normalizeUrl, fetchPage } from "@/lib/wah-wah/extract";

describe("normalizeUrl", () => {
  it("adds https:// when missing", () => {
    expect(normalizeUrl("acme.com")).toBe("https://acme.com/");
  });

  it("rejects non-http protocols", () => {
    expect(() => normalizeUrl("ftp://acme.com")).toThrow();
  });

  it("rejects localhost and private hosts", () => {
    expect(() => normalizeUrl("http://localhost:3000")).toThrow();
    expect(() => normalizeUrl("http://192.168.1.1")).toThrow();
    expect(() => normalizeUrl("http://10.0.0.5")).toThrow();
    expect(() => normalizeUrl("http://127.0.0.1")).toThrow();
  });
});

describe("fetchPage redirect handling", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects redirects to private hosts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, { status: 302, headers: { location: "http://10.0.0.5/admin" } })
      )
    );
    await expect(fetchPage("https://acme.com/")).rejects.toThrow(/public website/i);
  });

  it("gives up after too many redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, { status: 301, headers: { location: "https://acme.com/next" } })
      )
    );
    await expect(fetchPage("https://acme.com/")).rejects.toThrow(/too many redirects/i);
    expect(vi.mocked(fetch).mock.calls.length).toBe(5);
  });
});

describe("extractPageText", () => {
  const html = `
    <html><head>
      <title>Acme Creative</title>
      <meta name="description" content="A full-service creative agency.">
      <style>.x{color:red}</style>
      <script>console.log("ignore me")</script>
    </head><body>
      <nav>Home About</nav>
      <h1>Brands that resonate</h1>
      <p>We are results-driven and strategic.</p>
    </body></html>`;

  it("extracts title, meta description, h1, and body text", () => {
    const page = extractPageText(html);
    expect(page.title).toBe("Acme Creative");
    expect(page.metaDescription).toBe("A full-service creative agency.");
    expect(page.h1).toBe("Brands that resonate");
    expect(page.bodyText).toContain("results-driven");
  });

  it("strips script and style content", () => {
    const page = extractPageText(html);
    expect(page.bodyText).not.toContain("ignore me");
    expect(page.bodyText).not.toContain("color:red");
  });
});
