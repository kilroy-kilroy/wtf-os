import { ImageResponse } from "next/og";
import { getReport } from "@/lib/case-study-lab/db";
import { CARD_SIZES, buildCardModel, type CardSize } from "@/components/case-study-lab/cardModel";

const LOGO_HEIGHT = 72;
const LOGO_MAX_WIDTH = 360;

// Satori collapses <img width="auto"> to zero width, so logos need an explicit
// numeric width. Read the logo's intrinsic PNG/JPEG size and scale it to the
// fixed header height. Falls back to a reasonable width if the size can't be read.
async function logoWidth(url: string): Promise<number> {
  const fallback = LOGO_HEIGHT * 3;
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const dv = new DataView(await res.arrayBuffer());
    let w = 0;
    let h = 0;
    if (dv.byteLength > 24 && dv.getUint8(0) === 0x89 && dv.getUint8(1) === 0x50) {
      // PNG: IHDR width/height are big-endian uint32 at offsets 16 and 20.
      w = dv.getUint32(16);
      h = dv.getUint32(20);
    } else if (dv.byteLength > 4 && dv.getUint8(0) === 0xff && dv.getUint8(1) === 0xd8) {
      // JPEG: scan for a SOF marker carrying height/width.
      let o = 2;
      while (o + 9 < dv.byteLength) {
        if (dv.getUint8(o) !== 0xff) { o++; continue; }
        const marker = dv.getUint8(o + 1);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          h = dv.getUint16(o + 5);
          w = dv.getUint16(o + 7);
          break;
        }
        o += 2 + dv.getUint16(o + 2);
      }
    }
    if (!w || !h) return fallback;
    return Math.min(Math.round(LOGO_HEIGHT * (w / h)), LOGO_MAX_WIDTH);
  } catch {
    return fallback;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const sizeParam = new URL(req.url).searchParams.get("size") as CardSize | null;
  const size = sizeParam && sizeParam in CARD_SIZES ? sizeParam : "portrait";
  const dims = CARD_SIZES[size];

  const report = await getReport(id);
  if (!report || !report.result) {
    return new Response("Not found", { status: 404 });
  }
  const m = buildCardModel(report);

  // Resolve explicit logo widths up front (Satori needs real numeric dimensions).
  const [agencyLogoW, clientLogoW] = await Promise.all([
    m.agencyLogoUrl ? logoWidth(m.agencyLogoUrl) : Promise.resolve(0),
    m.clientLogoUrl ? logoWidth(m.clientLogoUrl) : Promise.resolve(0),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0b",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Co-branded header — agency (left) × client (right) */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {m.agencyLogoUrl ? (
            <img
              src={m.agencyLogoUrl}
              alt={m.agencyName ?? "Agency"}
              width={agencyLogoW}
              height={LOGO_HEIGHT}
              style={{ objectFit: "contain" }}
            />
          ) : m.agencyName ? (
            <div style={{ display: "flex", fontSize: 40, fontWeight: 900, color: "#ffffff" }}>
              {m.agencyName}
            </div>
          ) : null}

          {(m.agencyLogoUrl || m.agencyName) ? (
            <div style={{ display: "flex", fontSize: 44, color: "#4a4a4a" }}>×</div>
          ) : null}

          {m.clientLogoUrl ? (
            <img
              src={m.clientLogoUrl}
              alt={m.clientName}
              width={clientLogoW}
              height={LOGO_HEIGHT}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                background: m.accent,
                borderRadius: 12,
                fontSize: 40,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              {m.clientName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28, color: "#9aa0a6", display: "flex" }}>{m.clientDescriptor}</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: "#ffffff", lineHeight: 1.05, display: "flex" }}>
            {m.headline}
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {m.topResults.map((r, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: m.accent, display: "flex" }}>{r.value}</div>
              <div style={{ fontSize: 24, color: "#c8c8c8", display: "flex" }}>{r.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {m.quote ? (
            <div style={{ fontSize: 28, color: "#e6e6e6", fontStyle: "italic", display: "flex" }}>
              {`"${m.quote.text}"`}
            </div>
          ) : null}
          <div style={{ fontSize: 26, color: m.accent, fontWeight: 700, display: "flex" }}>{m.cta}</div>
          {/* No Tim/Case Study Lab mark on the downloadable asset — it carries the
              agency's client logo and goes to their prospects. Locked decision
              (see 2026-06-24 spec). The hosted report page keeps the branding. */}
        </div>
      </div>
    ),
    dims
  );
}
