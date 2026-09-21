// packages/pdf/contract-report.tsx
//
// Contract -> PDF via @react-pdf/renderer. Lives in @repo/pdf (alongside the
// other react-pdf reports) on purpose: rendering react-pdf from app code in the
// Next server/RSC bundle produces "Minified React error #31" in production. The
// package's own transpile produces clean elements, matching the working reports.
//
// The merged HTML keeps Firma anchors as literal text ({{sig_client}},
// {{date_client}}, {{init_client}}, ...). react-pdf emits selectable text, so the
// anchors survive for Firma to bind fields to. Per-page initials use react-pdf's
// native `fixed` prop (footer repeats on every page).

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

type DomNode = {
  type: string;
  name?: string;
  data?: string;
  children?: DomNode[];
  attribs?: Record<string, string>;
};


// ---------------------------------------------------------------------------
// Embedded contract font.
//
// WHY THIS EXISTS: react-pdf's default Times-Roman/Bold/Italic are PDF
// "standard-14" fonts, which carry no /Widths array — every conformant reader is
// expected to already know their metrics. As of 2026-09-04 Firma's anchor
// binder no longer does, and rejects any such document with
//   VALIDATION_ERROR: Anchor '{{sig_client}}': no glyph advances for font <id>
// Verified by resubmitting a PDF Firma itself accepted in June 2026: rejected
// today, byte-identical, with matching font dictionaries. So this is not a
// regression in this repo — but embedding a real font removes the dependency on
// any third party's standard-14 support, permanently.
//
// Poppins matches the hand-built KLRY contracts these PDFs are meant to look
// like. SIL Open Font License — see public/fonts/OFL.txt.
const FONT_FAMILY = 'Poppins';
const FONT_FILES = {
  regular: 'Poppins-Regular.ttf',
  medium: 'Poppins-Medium.ttf',
  semibold: 'Poppins-SemiBold.ttf',
  bold: 'Poppins-Bold.ttf',
  italic: 'Poppins-Italic.ttf',
} as const;

/**
 * Resolve a font to a local path when the file is on disk (dev, and any host
 * that ships public/), else to the app's own public URL — the same approach
 * loadLogo() already uses for the letterhead.
 */
function fontSrc(file: string): string {
  // cwd differs by caller — apps/web under `next dev`, the repo root for scripts —
  // so probe both rather than assuming one.
  for (const dir of [
    join(process.cwd(), 'public', 'fonts'),
    join(process.cwd(), 'apps', 'web', 'public', 'fonts'),
  ]) {
    const local = join(dir, file);
    if (existsSync(local)) return local;
  }
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const base = envUrl && envUrl.startsWith('https://') ? envUrl : 'https://app.timkilroy.com';
  return `${base}/fonts/${file}`;
}

let fontsRegistered = false;
/** Register once per process; re-registering the same family is wasteful. */
function ensureFonts(): void {
  if (fontsRegistered) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: fontSrc(FONT_FILES.regular), fontWeight: 400, fontStyle: 'normal' },
      { src: fontSrc(FONT_FILES.medium), fontWeight: 500, fontStyle: 'normal' },
      { src: fontSrc(FONT_FILES.semibold), fontWeight: 600, fontStyle: 'normal' },
      { src: fontSrc(FONT_FILES.bold), fontWeight: 700, fontStyle: 'normal' },
      { src: fontSrc(FONT_FILES.italic), fontWeight: 400, fontStyle: 'italic' },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  // paddingTop clears the letterhead block; paddingBottom clears the four-line
  // footer, whose lowest rule sits at INITIALS_LAYOUT.counter.
  page: {
    paddingTop: 104, paddingBottom: 104, paddingHorizontal: 64,
    fontFamily: FONT_FAMILY, fontSize: 10.5, lineHeight: 1.6, color: '#1a1a1a',
  },
  // The letterhead: white mark reversed out of a brand-red block, top right.
  header: { position: 'absolute', top: 34, right: 64 },
  logoBlock: {
    backgroundColor: '#E51B23', paddingVertical: 9, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: 112, height: 56, objectFit: 'contain' },

  h1: {
    fontSize: 15, fontFamily: FONT_FAMILY, fontWeight: 700, textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 58, marginBottom: 22,
  },
  // Section headings are set apart by colour and case rather than size, which
  // is what keeps the body copy dominant the way the reference does.
  h2: {
    fontSize: 9.5, fontFamily: FONT_FAMILY, fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 17, marginBottom: 5,
  },
  h3: {
    fontSize: 10, fontFamily: FONT_FAMILY, fontWeight: 600, color: '#374151',
    marginTop: 12, marginBottom: 4,
  },
  // Left-aligned, not justified: react-pdf justifies by stretching spaces, which
  // on a long clause opens rivers the reference does not have.
  p: { marginBottom: 9, textAlign: 'left' },
  listItem: { flexDirection: 'row', marginBottom: 5, paddingLeft: 16 },
  listMarker: { width: 20 },
  listBody: { flex: 1, textAlign: 'left' },
  bold: { fontFamily: FONT_FAMILY, fontWeight: 700 },
  italic: { fontFamily: FONT_FAMILY, fontStyle: 'italic' },
  sigBlock: { marginTop: 26 },

  footerNote: { fontSize: 9, fontStyle: 'italic', color: '#1a1a1a', textAlign: 'right' },
  footerLabel: { fontSize: 9, color: '#1a1a1a', textAlign: 'right' },
});

const elementChildren = (node?: DomNode): DomNode[] =>
  (node?.children ?? []).filter((c) => c.type === 'tag');

/**
 * Collapse a run of whitespace to a single space, which is what HTML means by
 * whitespace in flow content.
 *
 * WHY THIS EXISTS: react-pdf honours "\n" inside <Text> as a hard line break.
 * Our templates wrap their paragraphs across source lines, so passing text
 * nodes through verbatim broke sentences mid-clause at whatever column the
 * author happened to wrap at — 11 of the MSA's 12 paragraphs. An explicit
 * <br/> still produces a real break; only insignificant whitespace is folded.
 */
export function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/** Rule widths, in characters, for each kind of retired anchor. */
const ANCHOR_RULE: Record<string, number> = { sig: 18, date: 12, init: 4 };
const FIRMA_ANCHOR = /\{\{\s*(sig|date|init)_[a-z]+\s*\}\}/gi;

/**
 * Turn a retired {{sig_*}} / {{date_*}} / {{init_*}} anchor into a blank rule.
 *
 * Signature placement is by coordinate now (see docs/firma-anchor-outage-2026-09.md),
 * so these template anchors bind nothing — but they are still text, and until
 * this they printed to the client verbatim as "Signature: {{sig_client}}".
 */
export function blankFirmaAnchors(text: string): string {
  return text.replace(FIRMA_ANCHOR, (_m, kind: string) =>
    '_'.repeat(ANCHOR_RULE[kind.toLowerCase()] ?? 12));
}

/** Drop the insignificant space at the very start and end of a block. */
function trimEnds(nodes: React.ReactNode[]): React.ReactNode[] {
  const out = [...nodes];
  if (typeof out[0] === 'string') out[0] = (out[0] as string).replace(/^ +/, '');
  const last = out.length - 1;
  if (typeof out[last] === 'string') out[last] = (out[last] as string).replace(/ +$/, '');
  return out.filter((n) => n !== '');
}

const isList = (n: DomNode) => n.name === 'ul' || n.name === 'ol';

/** a, b, ... z, aa, ab — so a list longer than the alphabet still reads. */
function alpha(index: number, upper: boolean): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return upper ? out.toUpperCase() : out;
}

/**
 * Ordered lists read A. B. C. at the top level and a. b. c. one level in,
 * matching the executed KLRY contracts. Deeper nesting falls back to numbers.
 */
export function listMarker(index: number, depth: number, ordered: boolean): string {
  if (!ordered) return '\u2022';
  if (depth === 0) return `${alpha(index, true)}.`;
  if (depth === 1) return `${alpha(index, false)}.`;
  return `${index + 1}.`;
}

function inlineContent(node: DomNode, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  (node.children ?? []).forEach((child, i) => {
    const key = `${keyBase}-${i}`;
    if (child.type === 'text') {
      if (child.data) out.push(normalizeInlineText(blankFirmaAnchors(child.data)));
    } else if (child.type === 'tag') {
      if (child.name === 'br') {
        out.push('\n');
      } else if (isList(child)) {
        // Nested lists are blocks; they are rendered after the item's own text.
      } else if (child.name === 'strong' || child.name === 'b') {
        out.push(<Text key={key} style={styles.bold}>{inlineContent(child, key)}</Text>);
      } else if (child.name === 'em' || child.name === 'i') {
        out.push(<Text key={key} style={styles.italic}>{inlineContent(child, key)}</Text>);
      } else {
        out.push(...inlineContent(child, key));
      }
    }
  });
  return out;
}

function listItems(listEl: DomNode, key: string, ordered: boolean, depth: number): React.ReactNode[] {
  return elementChildren(listEl)
    .filter((li) => li.name === 'li')
    .map((li, i) => {
      const nested = elementChildren(li).filter(isList);
      return (
        <View key={`${key}-li-${i}`}>
          <View style={styles.listItem}>
            <Text style={styles.listMarker}>{listMarker(i, depth, ordered)}</Text>
            <Text style={styles.listBody}>{trimEnds(inlineContent(li, `${key}-li-${i}`))}</Text>
          </View>
          {nested.map((n, j) => (
            <View key={`${key}-li-${i}-n${j}`} style={{ paddingLeft: 16 }}>
              {listItems(n, `${key}-li-${i}-n${j}`, n.name === 'ol', depth + 1)}
            </View>
          ))}
        </View>
      );
    });
}

function renderBlock(el: DomNode, key: string, depth: number): React.ReactNode {
  switch (el.name) {
    case 'h1': return <Text key={key} style={styles.h1}>{trimEnds(inlineContent(el, key))}</Text>;
    case 'h2': return <Text key={key} style={styles.h2}>{trimEnds(inlineContent(el, key))}</Text>;
    case 'h3':
    case 'h4': return <Text key={key} style={styles.h3}>{trimEnds(inlineContent(el, key))}</Text>;
    case 'p': return <Text key={key} style={styles.p}>{trimEnds(inlineContent(el, key))}</Text>;
    case 'ul': return <View key={key}>{listItems(el, key, false, depth)}</View>;
    case 'ol': return <View key={key}>{listItems(el, key, true, depth)}</View>;
    case 'div': {
      const cls = el.attribs?.class ?? '';
      // The template's own initials line is rendered by PageFooter instead, so
      // its {{init_*}} anchors never reach the page as literal text.
      if (cls.includes('page-initials')) return null;
      if (cls.includes('page-break')) return <View key={key} break />;
      if (cls.includes('sig-block')) {
        return <View key={key} style={styles.sigBlock} wrap={false}>{renderBlocks(el, key, depth)}</View>;
      }
      return <View key={key}>{renderBlocks(el, key, depth)}</View>;
    }
    default: return <Text key={key} style={styles.p}>{trimEnds(inlineContent(el, key))}</Text>;
  }
}

function renderBlocks(parent: DomNode, keyBase: string, depth: number): React.ReactNode[] {
  return elementChildren(parent).map((el, i) => renderBlock(el, `${keyBase}-${i}`, depth));
}

/** One party's initials rule plus its right-aligned label, on every page. */
function InitialsSlot({ slot, label, keyBase }: { slot: SignatureSlot; label: string; keyBase: string }) {
  return (
    <View key={keyBase} fixed style={{ position: 'absolute', top: pct(slot.y), left: 0, right: 0 }}>
      <Text style={{ ...styles.footerLabel, position: 'absolute', left: 0, width: pct(slot.x - 0.8) }}>
        {label}
      </Text>
      <View style={{
        position: 'absolute', left: pct(slot.x), top: slot.height * 7.92,
        width: pct(slot.width), borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
      }} />
    </View>
  );
}

/**
 * Confidential marker, page number and both initials rules. Direct children of
 * <Page> so react-pdf repeats them and re-evaluates the page number; the
 * initials rules sit at INITIALS_LAYOUT, which is also what Firma is told.
 */
function pageChrome(logo: Buffer | undefined, initials: boolean): React.ReactNode[] {
  const right = pct(INITIALS_LAYOUT.client.x + INITIALS_LAYOUT.client.width);
  const out: React.ReactNode[] = [];
  if (logo) {
    out.push(
      <View key="hdr" style={styles.header} fixed>
        <View style={styles.logoBlock}><Image src={logo} style={styles.logo} /></View>
      </View>,
    );
  }
  out.push(
    <Text key="f-conf" fixed style={{ ...styles.footerNote, position: 'absolute', top: pct(88.8), left: 0, width: right }}>
      Confidential
    </Text>,
    <Text
      key="f-page"
      fixed
      style={{ ...styles.footerNote, position: 'absolute', top: pct(91.1), left: 0, width: right }}
      render={({ pageNumber }) => `${pageNumber}`}
    />,
  );
  if (initials) {
    out.push(
      <InitialsSlot key="f-init-client" keyBase="f-init-client" slot={INITIALS_LAYOUT.client} label="Client Initials:" />,
      <InitialsSlot key="f-init-counter" keyBase="f-init-counter" slot={INITIALS_LAYOUT.counter} label="KLRY, LLC: Initials:" />,
    );
  }
  return out;
}

function ContractDocument({ html, logo, signaturePage }: {
  html: string; logo?: Buffer; signaturePage?: SignaturePageSpec;
}) {
  const $ = load(html);
  const body = ($('body').get(0) ?? $.root().get(0)) as unknown as DomNode;
  const blocks = renderBlocks(body, 'c', 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {pageChrome(logo, true)}
        {blocks}
      </Page>
      {signaturePage ? <SignaturePage {...signaturePage} logo={logo} /> : null}
    </Document>
  );
}

/** Render merged contract HTML (+ optional logo bytes) to a PDF buffer. */

// ---------------------------------------------------------------------------
// Coordinate signature page.
//
// Firma's anchor binder cannot read glyph advances from what react-pdf emits
// (see docs/firma-anchor-outage-2026-09.md), so fields are placed by coordinate
// instead of by searching for {{sig_*}} text. Coordinates only stay valid if the
// signature block sits somewhere predictable — hence a dedicated final page with
// absolutely positioned slots.
//
// These percentages are the single source of truth: the visual slots below and
// the Firma `fields` payload are both derived from them, so they cannot drift.
export interface SignatureSlot { x: number; y: number; width: number; height: number }

/**
 * Percent-of-page positions for every signature field, in Firma's `position`
 * units. This is the single source of truth: the slots drawn on the page below
 * and the coordinates sent to Firma both read from here, so they cannot drift.
 *
 * Two parties, stacked, on a page that carries nothing else — which is what
 * keeps these numbers valid no matter how long the contract runs.
 */
export const SIGNATURE_LAYOUT = {
  client: {
    signature: { x: 10, y: 30, width: 34, height: 7 },
    date: { x: 52, y: 30, width: 26, height: 7 },
  },
  counter: {
    signature: { x: 10, y: 58, width: 34, height: 7 },
    date: { x: 52, y: 58, width: 26, height: 7 },
  },
} as const;

/**
 * Per-page initials rules, in the same percent-of-page units. Both parties
 * initial every page, so these are emitted once per page as Firma `initial`
 * fields — and drawn from this same object, so the rule a signer sees and the
 * box Firma binds cannot drift apart.
 *
 * `y` is the top of the field box; the visible rule is drawn at its bottom.
 * `x + width` is the right edge of the text column (612pt page, 64pt margins).
 */
export const INITIALS_LAYOUT = {
  client: { x: 81.5, y: 93.5, width: 8, height: 1.8 },
  counter: { x: 81.5, y: 95.8, width: 8, height: 1.8 },
} as const;

export interface SignaturePageSpec {
  clientName: string;
  counterName: string;
  counterTitle: string;
  effectiveDate: string;
  /**
   * true  — KLRY signs too, so its slot is a live Firma field (contracts).
   * false — KLRY is pre-executed, rendered as typed text (the Call Vault NDA,
   *         which exists precisely so nobody waits on a countersignature).
   */
  counterSigns: boolean;
}

const pct = (n: number) => `${n}%`;

/** One party's ruled line, caption and party name, positioned absolutely. */
function SlotMarks({ slot, dateSlot, party }: {
  slot: SignatureSlot; dateSlot: SignatureSlot; party: string;
}) {
  return (
    <>
      <Text style={{ position: 'absolute', left: pct(slot.x), top: pct(slot.y - 4), fontSize: 9, color: '#666' }}>
        {party}
      </Text>
      <View style={{ position: 'absolute', left: pct(slot.x), top: pct(slot.y + slot.height), width: pct(slot.width), borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }} />
      <Text style={{ position: 'absolute', left: pct(slot.x), top: pct(slot.y + slot.height + 1.5), fontSize: 8, color: '#666' }}>
        Signature
      </Text>
      <View style={{ position: 'absolute', left: pct(dateSlot.x), top: pct(dateSlot.y + dateSlot.height), width: pct(dateSlot.width), borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }} />
      <Text style={{ position: 'absolute', left: pct(dateSlot.x), top: pct(dateSlot.y + dateSlot.height + 1.5), fontSize: 8, color: '#666' }}>
        Date
      </Text>
    </>
  );
}

/** A final page carrying only the execution block, so slot positions are fixed. */
function SignaturePage({ clientName, counterName, counterTitle, effectiveDate, counterSigns, logo }: SignaturePageSpec & { logo?: Buffer }) {
  const L = SIGNATURE_LAYOUT;
  return (
    <Page size="LETTER" style={styles.page} break>
      {pageChrome(logo, false)}
      <Text style={styles.h2}>Execution</Text>
      <Text style={styles.p}>IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.</Text>

      <SlotMarks slot={L.client.signature} dateSlot={L.client.date} party={clientName} />

      {counterSigns ? (
        <SlotMarks slot={L.counter.signature} dateSlot={L.counter.date} party={counterName} />
      ) : (
        <View style={{ position: 'absolute', left: pct(L.counter.signature.x), top: pct(L.counter.signature.y) }}>
          <Text style={{ fontSize: 9, color: '#666' }}>{counterName}</Text>
          <Text style={{ marginTop: 10, fontSize: 11 }}>{counterTitle}</Text>
          <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>Signed {effectiveDate}</Text>
        </View>
      )}
    </Page>
  );
}

export async function renderContractReport(
  html: string,
  logo?: Buffer,
  signaturePage?: SignaturePageSpec,
): Promise<Buffer> {
  // Must happen before render: the embedded family is what gives the PDF real
  // outlines and widths rather than relying on standard-14 metrics.
  ensureFonts();
  return renderToBuffer(
    React.createElement(ContractDocument, { html, logo, signaturePage }) as any,
  );
}
