import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  scoreCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    marginBottom: 20,
    borderRadius: 4,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#334155',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gradeGood: {
    color: '#16a34a',
  },
  gradeFair: {
    color: '#eab308',
  },
  gradePoor: {
    color: '#dc2626',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e293b',
    borderBottom: '2 solid #e2e8f0',
    paddingBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1 solid #f1f5f9',
  },
  categoryName: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  categoryScore: {
    fontSize: 11,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  categoryReason: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 4,
  },
  quote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#475569',
    marginBottom: 6,
    padding: 8,
    backgroundColor: '#ffffff',
    borderLeft: '3 solid #cbd5e1',
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 2,
  },
  text: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 1.4,
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

interface CallLabReportProps {
  result: {
    overall_score: number;
    overall_grade: string;
    diagnosis_summary: string;
    scores: Record<string, { score: number; reason: string }>;
    strengths: Array<{ quote: string; behavior: string; note: string }>;
    weaknesses: Array<{ quote: string; behavior: string; note: string }>;
    focus_area: { theme: string; why: string; drill: string };
    follow_ups: Array<{ type: string; subject: string; body: string }>;
    tasks: string[];
  };
  metadata?: {
    date?: string;
    repName?: string;
    prospectCompany?: string;
  };
}

export const CallLabReport: React.FC<CallLabReportProps> = ({ result, metadata }) => {
  const getGradeStyle = (grade: string) => {
    if (grade === 'A' || grade === 'B') return styles.gradeGood;
    if (grade === 'C') return styles.gradeFair;
    return styles.gradePoor;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return '#16a34a';
    if (score >= 3) return '#3b82f6';
    if (score >= 2) return '#eab308';
    return '#dc2626';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Call Lab Lite - Analysis Report</Text>
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

        {/* Overall Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Overall Performance</Text>
          <Text style={[styles.scoreValue, getGradeStyle(result.overall_grade)]}>
            Grade {result.overall_grade} ({result.overall_score}/5)
          </Text>
          <Text style={styles.text}>{result.diagnosis_summary}</Text>
        </View>

        {/* Category Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Scores</Text>
          {Object.entries(result.scores).map(([category, data]) => (
            <View key={category} style={categoryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>
                  {category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
                <Text style={styles.categoryReason}>{data.reason}</Text>
              </View>
              <Text style={[styles.categoryScore, { color: getScoreColor(data.score) }]}>
                {data.score}/5
              </Text>
            </View>
          ))}
        </View>

        {/* Strengths */}
        {result.strengths.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Strengths ({result.strengths.length})</Text>
            {result.strengths.map((strength, idx) => (
              <View key={idx} style={styles.itemContainer}>
                <Text style={styles.quote}>"{strength.quote}"</Text>
                <Text style={styles.label}>What Worked:</Text>
                <Text style={styles.text}>{strength.behavior}</Text>
                <Text style={styles.label}>Why It Matters:</Text>
                <Text style={styles.text}>{strength.note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weaknesses */}
        {result.weaknesses.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Areas for Improvement ({result.weaknesses.length})</Text>
            {result.weaknesses.map((weakness, idx) => (
              <View key={idx} style={styles.itemContainer}>
                <Text style={styles.quote}>"{weakness.quote}"</Text>
                <Text style={styles.label}>What Happened:</Text>
                <Text style={styles.text}>{weakness.behavior}</Text>
                <Text style={styles.label}>How to Improve:</Text>
                <Text style={styles.text}>{weakness.note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Focus Area */}
        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Primary Focus Area</Text>
          <View style={styles.itemContainer}>
            <Text style={styles.label}>Theme:</Text>
            <Text style={styles.text}>{result.focus_area.theme}</Text>
            <Text style={styles.label}>Why This Matters:</Text>
            <Text style={styles.text}>{result.focus_area.why}</Text>
            <Text style={styles.label}>Practice Drill:</Text>
            <Text style={styles.text}>{result.focus_area.drill}</Text>
          </View>
        </View>

        {/* Action Items */}
        {result.tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Steps</Text>
            {result.tasks.map((task, idx) => (
              <Text key={idx} style={[styles.text, { marginLeft: 12 }]}>
                • {task}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Call Lab Lite - Sales Call Analysis Report
        </Text>
      </Page>
    </Document>
  );
};
