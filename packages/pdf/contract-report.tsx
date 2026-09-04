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
// Tinos is metrically compatible with Times New Roman, so contracts render
// essentially unchanged. SIL Open Font License — see public/fonts/OFL.txt.
const FONT_FAMILY = 'Tinos';
const FONT_FILES = {
  regular: 'Tinos-Regular.ttf',
  bold: 'Tinos-Bold.ttf',
  italic: 'Tinos-Italic.ttf',
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
      { src: fontSrc(FONT_FILES.regular), fontWeight: 'normal', fontStyle: 'normal' },
      { src: fontSrc(FONT_FILES.bold), fontWeight: 'bold', fontStyle: 'normal' },
      { src: fontSrc(FONT_FILES.italic), fontWeight: 'normal', fontStyle: 'italic' },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 70, paddingBottom: 56, paddingHorizontal: 60,
    fontFamily: FONT_FAMILY, fontSize: 11, lineHeight: 1.5, color: '#1a1a1a',
  },
  header: { position: 'absolute', top: 26, left: 60, right: 60, flexDirection: 'row', justifyContent: 'flex-start' },
  logo: { height: 24, objectFit: 'contain' },
  h1: { fontSize: 17, fontFamily: FONT_FAMILY, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, marginBottom: 14 },
  h2: { fontSize: 12.5, fontFamily: FONT_FAMILY, fontWeight: 'bold', marginTop: 14, marginBottom: 5 },
  h3: { fontSize: 11.5, fontFamily: FONT_FAMILY, fontWeight: 'bold', marginTop: 11, marginBottom: 4 },
  p: { marginBottom: 7, textAlign: 'justify' },
  listItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 6 },
  listMarker: { width: 18 },
  listBody: { flex: 1, textAlign: 'justify' },
  bold: { fontFamily: FONT_FAMILY, fontWeight: 'bold' },
  italic: { fontFamily: FONT_FAMILY, fontStyle: 'italic' },
  sigBlock: { marginTop: 26 },
  initialsFooter: { position: 'absolute', bottom: 30, left: 60, right: 60, fontSize: 8, color: '#666', textAlign: 'right' },
  pageNumber: { position: 'absolute', bottom: 30, left: 60, fontSize: 8, color: '#999' },
});

const elementChildren = (node?: DomNode): DomNode[] =>
  (node?.children ?? []).filter((c) => c.type === 'tag');

function inlineContent(node: DomNode, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  (node.children ?? []).forEach((child, i) => {
    const key = `${keyBase}-${i}`;
    if (child.type === 'text') {
      if (child.data) out.push(child.data);
    } else if (child.type === 'tag') {
      if (child.name === 'br') {
        out.push('\n');
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

function listItems(listEl: DomNode, key: string, ordered: boolean): React.ReactNode[] {
  return elementChildren(listEl)
    .filter((li) => li.name === 'li')
    .map((li, i) => (
      <View key={`${key}-li-${i}`} style={styles.listItem}>
        <Text style={styles.listMarker}>{ordered ? `${i + 1}.` : '•'}</Text>
        <Text style={styles.listBody}>{inlineContent(li, `${key}-li-${i}`)}</Text>
      </View>
    ));
}

function renderBlock(el: DomNode, key: string): React.ReactNode {
  switch (el.name) {
    case 'h1': return <Text key={key} style={styles.h1}>{inlineContent(el, key)}</Text>;
    case 'h2': return <Text key={key} style={styles.h2}>{inlineContent(el, key)}</Text>;
    case 'h3':
    case 'h4': return <Text key={key} style={styles.h3}>{inlineContent(el, key)}</Text>;
    case 'p': return <Text key={key} style={styles.p}>{inlineContent(el, key)}</Text>;
    case 'ul': return <View key={key}>{listItems(el, key, false)}</View>;
    case 'ol': return <View key={key}>{listItems(el, key, true)}</View>;
    case 'div': {
      const cls = el.attribs?.class ?? '';
      if (cls.includes('page-initials')) return null;
      if (cls.includes('page-break')) return <View key={key} break />;
      if (cls.includes('sig-block')) {
        return <View key={key} style={styles.sigBlock} wrap={false}>{renderBlocks(el, key)}</View>;
      }
      return <View key={key}>{renderBlocks(el, key)}</View>;
    }
    default: return <Text key={key} style={styles.p}>{inlineContent(el, key)}</Text>;
  }
}

function renderBlocks(parent: DomNode, keyBase: string): React.ReactNode[] {
  return elementChildren(parent).map((el, i) => renderBlock(el, `${keyBase}-${i}`));
}

function ContractDocument({ html, logo }: { html: string; logo?: Buffer }) {
  const $ = load(html);
  const body = ($('body').get(0) ?? $.root().get(0)) as unknown as DomNode;
  const blocks = renderBlocks(body, 'c');

  const initialsEl = $('.page-initials').first();
  const initials = initialsEl.length ? initialsEl.text().replace(/\s+/g, ' ').trim() : '';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {logo ? (
          <View style={styles.header} fixed>
            <Image src={logo} style={styles.logo} />
          </View>
        ) : null}
        {initials ? <Text style={styles.initialsFooter} fixed>{initials}</Text> : null}
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
        {blocks}
      </Page>
    </Document>
  );
}

/** Render merged contract HTML (+ optional logo bytes) to a PDF buffer. */
export async function renderContractReport(html: string, logo?: Buffer): Promise<Buffer> {
  // Must happen before render: the embedded family is what gives the PDF real
  // glyph advances, which is what lets an e-sign provider bind text anchors.
  ensureFonts();
  return renderToBuffer(React.createElement(ContractDocument, { html, logo }) as any);
}
