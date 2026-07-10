import { Document, Page, Text, View, StyleSheet, Link, Image, renderToBuffer } from "@react-pdf/renderer";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCaseStudyView, type CaseStudyView } from "@/lib/case-study-lab/view";

export const dynamic = "force-dynamic";
const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

function styles(accent: string) {
  return StyleSheet.create({
    page: { fontFamily: "Helvetica", color: "#16181d", fontSize: 10 },
    band: { flexDirection: "row", alignItems: "center", backgroundColor: accent, color: "#fff", paddingVertical: 16, paddingHorizontal: 40 },
    agency: { fontFamily: "Helvetica-Bold", fontSize: 15, color: "#fff" },
    body: { paddingHorizontal: 40, paddingVertical: 26 },
    kicker: { color: accent, fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8 },
    headline: { fontFamily: "Times-Roman", fontSize: 22, lineHeight: 1.2, marginBottom: 8 },
    dek: { color: "#5b6472", fontSize: 10.5, lineHeight: 1.5, marginBottom: 20 },
    cols: { flexDirection: "row", gap: 26 },
    left: { flex: 1 },
    label: { fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", borderBottomWidth: 1.5, borderBottomColor: "#16181d", paddingBottom: 5, marginBottom: 10, alignSelf: "flex-start" },
    pair: { borderBottomWidth: 1, borderBottomColor: "#e4e7ec", paddingVertical: 8 },
    challenge: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 },
    method: { color: "#5b6472", fontSize: 9.5, lineHeight: 1.45 },
    bridge: { fontFamily: "Helvetica-Bold", fontSize: 11, lineHeight: 1.4, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e4e7ec" },
    rail: { width: 170, backgroundColor: "#f6f7f9", borderRadius: 6, padding: 16 },
    railH: { color: "#5b6472", fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
    stat: { borderBottomWidth: 1, borderBottomColor: "#e4e7ec", paddingVertical: 10 },
    num: { color: accent, fontFamily: "Helvetica-Bold", fontSize: 30 },
    cap: { color: "#5b6472", fontSize: 9, marginTop: 4, lineHeight: 1.35 },
    quote: { marginTop: 22, backgroundColor: "#f6f7f9", borderLeftWidth: 3, borderLeftColor: accent, padding: 18 },
    quoteText: { fontFamily: "Times-Roman", fontSize: 13, lineHeight: 1.45, marginBottom: 8 },
    attr: { color: "#5b6472", fontSize: 9 },
    foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e7ec", paddingHorizontal: 40, paddingVertical: 16, marginTop: "auto" },
    cta: { color: "#fff", backgroundColor: accent, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, fontFamily: "Helvetica-Bold", fontSize: 10, textDecoration: "none" },
    powered: { color: "#5b6472", fontSize: 8 },
  });
}

function Doc({ v }: { v: CaseStudyView }) {
  const s = styles(v.accent);
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.band}>
          {v.agencyLogoUrl ? <Image src={v.agencyLogoUrl} style={{ height: 26, marginRight: 12 }} /> : v.agencyName ? <Text style={s.agency}>{v.agencyName}</Text> : null}
          {(v.agencyLogoUrl || v.agencyName) && v.clientLogoUrl ? <Text style={{ color: "#fff", opacity: 0.6, marginHorizontal: 8 }}>×</Text> : null}
          {v.clientLogoUrl ? <Image src={v.clientLogoUrl} style={{ height: 26 }} /> : null}
        </View>

        <View style={s.body}>
          {v.kicker ? <Text style={s.kicker}>{v.kicker}</Text> : null}
          <Text style={s.headline}>{v.headline}</Text>
          {v.dek ? <Text style={s.dek}>{v.dek}</Text> : null}

          <View style={s.cols}>
            <View style={s.left}>
              {v.approach.length > 0 ? <Text style={s.label}>{v.agencyName ? `What ${v.agencyName} did` : "What we did"}</Text> : null}
              {v.approach.map((a, i) => (
                <View key={i} style={s.pair}>
                  <Text style={s.challenge}>{a.challenge}</Text>
                  <Text style={s.method}>{a.method}</Text>
                </View>
              ))}
              {v.bridge ? <Text style={s.bridge}>{v.bridge}</Text> : null}
            </View>

            {v.stats.length > 0 ? (
              <View style={s.rail}>
                <Text style={s.railH}>The Results</Text>
                {v.stats.map((st, i) => (
                  <View key={i} style={s.stat}>
                    <Text style={s.num}>{ARROW[st.direction]} {st.value}</Text>
                    <Text style={s.cap}>{st.caption}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {v.quote ? (
            <View style={s.quote}>
              <Text style={s.quoteText}>&ldquo;{v.quote.text}&rdquo;</Text>
              <Text style={s.attr}>{v.quote.attribution}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.foot}>
          {v.ctaHref ? <Link src={v.ctaHref} style={s.cta}>{v.cta}</Link> : <Text style={{ color: v.accent, fontFamily: "Helvetica-Bold", fontSize: 10 }}>{v.cta}</Text>}
          <Link src={v.poweredByHref} style={s.powered}>Powered by Case Study Lab</Link>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report || !report.result) return new Response("Not found", { status: 404 });
  const v = buildCaseStudyView(report);
  const buffer = await renderToBuffer(<Doc v={v} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="case-study.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
