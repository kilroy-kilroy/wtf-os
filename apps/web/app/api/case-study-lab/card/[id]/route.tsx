import { ImageResponse } from "next/og";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCaseStudyView } from "@/lib/case-study-lab/view";
import { CARD_SIZES, type CardSize } from "@/components/case-study-lab/cardModel";

const LOGO_HEIGHT = 56;
const LOGO_MAX_WIDTH = 300;
const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

async function logoWidth(url: string): Promise<number> {
  const fallback = LOGO_HEIGHT * 3;
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const dv = new DataView(await res.arrayBuffer());
    let w = 0, h = 0;
    if (dv.byteLength > 24 && dv.getUint8(0) === 0x89 && dv.getUint8(1) === 0x50) {
      w = dv.getUint32(16); h = dv.getUint32(20);
    } else if (dv.byteLength > 4 && dv.getUint8(0) === 0xff && dv.getUint8(1) === 0xd8) {
      let o = 2;
      while (o + 9 < dv.byteLength) {
        if (dv.getUint8(o) !== 0xff) { o++; continue; }
        const m = dv.getUint8(o + 1);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = dv.getUint16(o + 5); w = dv.getUint16(o + 7); break; }
        o += 2 + dv.getUint16(o + 2);
      }
    }
    if (!w || !h) return fallback;
    return Math.min(Math.round(LOGO_HEIGHT * (w / h)), LOGO_MAX_WIDTH);
  } catch { return fallback; }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const sizeParam = new URL(req.url).searchParams.get("size") as CardSize | null;
  const size = sizeParam && sizeParam in CARD_SIZES ? sizeParam : "portrait";
  const dims = CARD_SIZES[size];

  const report = await getReport(id);
  if (!report || !report.result) return new Response("Not found", { status: 404 });
  const v = buildCaseStudyView(report);
  const [agencyLogoW, clientLogoW] = await Promise.all([
    v.agencyLogoUrl ? logoWidth(v.agencyLogoUrl) : Promise.resolve(0),
    v.clientLogoUrl ? logoWidth(v.clientLogoUrl) : Promise.resolve(0),
  ]);
  const stats = v.stats.slice(0, 3);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, background: v.accent, color: "#fff", padding: "28px 56px" }}>
          {v.agencyLogoUrl ? (
            <img src={v.agencyLogoUrl} width={agencyLogoW} height={LOGO_HEIGHT} style={{ objectFit: "contain" }} />
          ) : v.agencyName ? (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{v.agencyName}</div>
          ) : null}
          {(v.agencyLogoUrl || v.agencyName) && v.clientLogoUrl ? <div style={{ display: "flex", fontSize: 30, opacity: 0.6 }}>×</div> : null}
          {v.clientLogoUrl ? (
            <img src={v.clientLogoUrl} width={clientLogoW} height={LOGO_HEIGHT} style={{ objectFit: "contain", background: "rgba(255,255,255,.95)", borderRadius: 6, padding: 4 }} />
          ) : null}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", fontSize: 15, letterSpacing: 3, textTransform: "uppercase", opacity: 0.85 }}>Case Study</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "48px 56px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {v.kicker ? <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: v.accent, textTransform: "uppercase", letterSpacing: 2 }}>{v.kicker}</div> : null}
            <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: "#16181d", lineHeight: 1.08, letterSpacing: -1 }}>{v.headline}</div>
          </div>

          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", maxWidth: 320 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 76, fontWeight: 800, color: v.accent, letterSpacing: -2 }}>
                  <span style={{ fontSize: 34 }}>{ARROW[s.direction]}</span>{s.value}
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#5b6472", marginTop: 6 }}>{s.caption}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: v.accent }}>{v.cta}</div>
            <div style={{ display: "flex", fontSize: 18, color: "#9aa0a6" }}>Powered by Case Study Lab</div>
          </div>
        </div>
      </div>
    ),
    dims
  );
}
