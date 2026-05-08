import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import * as React from 'react';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.6 },
  h1: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: 'bold', marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  para: { marginBottom: 8 },
  meta: { fontSize: 10, color: '#666', marginBottom: 24 },
  cta: { marginTop: 24, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 },
});

interface Props {
  markdown: string;
  stage: string;
  composite: number;
  ctaTier: 'studio' | 'growth';
  name: string;
}

// Minimal markdown→PDF: split by lines, recognize # / ## / ### prefixes
function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split(/\n/);
  const nodes: React.ReactNode[] = [];
  let buf: string[] = [];

  function flush() {
    if (buf.length) {
      nodes.push(<Text key={nodes.length} style={styles.para}>{buf.join(' ')}</Text>);
      buf = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('# ')) { flush(); nodes.push(<Text key={nodes.length} style={styles.h1}>{line.slice(2)}</Text>); }
    else if (line.startsWith('## ')) { flush(); nodes.push(<Text key={nodes.length} style={styles.h2}>{line.slice(3)}</Text>); }
    else if (line.startsWith('### ')) { flush(); nodes.push(<Text key={nodes.length} style={styles.h3}>{line.slice(4)}</Text>); }
    else if (line.trim() === '') { flush(); }
    else { buf.push(line); }
  }
  flush();
  return nodes;
}

export function ReportPdf({ markdown, stage, composite, ctaTier, name }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.meta}>
          BD Hire Readiness Report for {name} · Stage: {stage} · Composite: {composite}/100
        </Text>
        <View>{renderMarkdown(markdown)}</View>
        <View style={styles.cta}>
          <Text>Next step: Book a call about SalesOS {ctaTier === 'growth' ? 'Growth' : 'Studio'} at https://timkilroy.com/book</Text>
        </View>
      </Page>
    </Document>
  );
}
