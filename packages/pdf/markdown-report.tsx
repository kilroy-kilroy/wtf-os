import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define styles for the markdown PDF with SalesOS branding
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '2 solid #E51B23',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#000000',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  metaInfo: {
    fontSize: 9,
    color: '#666666',
    marginTop: 8,
  },
  content: {
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.6,
  },
  heading2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#000000',
    borderTop: '1 solid #E51B23',
    paddingTop: 12,
    letterSpacing: 0.5,
  },
  heading3: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 8,
    color: '#000000',
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 10,
    color: '#000000',
  },
  divider: {
    borderBottom: '1 solid #E51B23',
    marginVertical: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
    borderTop: '1 solid #CCCCCC',
    paddingTop: 8,
  },
});

interface MarkdownReportProps {
  markdown: string;
  metadata?: {
    date?: string;
    repName?: string;
    prospectCompany?: string;
    tier?: string;
    product?: 'call-lab' | 'discovery-lab';
  };
}

/**
 * Simple markdown-to-PDF converter for CallLab reports
 * This is a basic implementation that handles the essential formatting
 */
export const MarkdownReport: React.FC<MarkdownReportProps> = ({ markdown, metadata }) => {
  // Simple markdown parser - converts markdown to PDF components
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let key = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <Text key={key++} style={styles.paragraph}>
            {currentParagraph.join(' ')}
          </Text>
        );
        currentParagraph = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Skip unicode box characters (decorative dividers)
      if (trimmed.match(/^━+$/)) {
        flushParagraph();
        elements.push(<View key={key++} style={styles.divider} />);
        return;
      }

      // Handle headings
      if (trimmed.startsWith('### ')) {
        flushParagraph();
        elements.push(
          <Text key={key++} style={styles.heading3}>
            {trimmed.replace('### ', '')}
          </Text>
        );
        return;
      }

      if (trimmed.startsWith('## ')) {
        flushParagraph();
        elements.push(
          <Text key={key++} style={styles.heading2}>
            {trimmed.replace('## ', '')}
          </Text>
        );
        return;
      }

      // Handle empty lines
      if (trimmed === '') {
        flushParagraph();
        return;
      }

      // Handle horizontal rules
      if (trimmed === '---') {
        flushParagraph();
        elements.push(<View key={key++} style={styles.divider} />);
        return;
      }

      // Regular text - accumulate into paragraph
      currentParagraph.push(trimmed);
    });

    flushParagraph();
    return elements;
  };

  const content = parseMarkdown(markdown);

  // Determine product name for display
  const isDiscoveryLab = metadata?.product === 'discovery-lab';
  const productName = isDiscoveryLab ? 'DISCOVERY LAB' : 'CALL LAB';
  const reportType = isDiscoveryLab ? 'PRE-CALL BRIEF' : 'DIAGNOSTIC SNAPSHOT';
  const footerDescription = isDiscoveryLab
    ? 'Pre-Call Intelligence Brief'
    : 'Sales Call Analysis Report';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {productName} {metadata?.tier === 'pro' ? 'PRO' : 'LITE'} — {reportType}
          </Text>
          <Text style={styles.subtitle}>Part of SalesOS</Text>
          {(metadata?.date || metadata?.repName || metadata?.prospectCompany) && (
            <View style={{ marginTop: 8 }}>
              {metadata?.date && (
                <Text style={styles.metaInfo}>Generated: {metadata.date}</Text>
              )}
              {metadata?.repName && (
                <Text style={styles.metaInfo}>Sales Rep: {metadata.repName}</Text>
              )}
              {metadata?.prospectCompany && (
                <Text style={styles.metaInfo}>
                  {isDiscoveryLab ? 'Target Company' : 'Prospect'}: {metadata.prospectCompany}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>{content}</View>

        {/* Footer */}
        <Text style={styles.footer}>
          {productName} {metadata?.tier === 'pro' ? 'Pro' : 'Lite'} - {footerDescription} | SalesOS
        </Text>
      </Page>
    </Document>
  );
};
