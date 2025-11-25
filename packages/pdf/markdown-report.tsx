import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define styles for the markdown PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  content: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.6,
  },
  heading2: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#1e293b',
  },
  heading3: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#334155',
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 10,
    color: '#475569',
  },
  divider: {
    borderBottom: '1 solid #e2e8f0',
    marginVertical: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1 solid #e2e8f0',
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Call Lab {metadata?.tier === 'pro' ? 'Pro' : 'Lite'} - Analysis Report
          </Text>
          {metadata?.date && (
            <Text style={styles.subtitle}>Generated: {metadata.date}</Text>
          )}
          {metadata?.repName && (
            <Text style={styles.subtitle}>Sales Rep: {metadata.repName}</Text>
          )}
          {metadata?.prospectCompany && (
            <Text style={styles.subtitle}>Prospect: {metadata.prospectCompany}</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>{content}</View>

        {/* Footer */}
        <Text style={styles.footer}>
          Call Lab {metadata?.tier === 'pro' ? 'Pro' : 'Lite'} - Sales Call Analysis Report
        </Text>
      </Page>
    </Document>
  );
};
