import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Pro report color scheme
const colors = {
  black: '#000000',
  darkGray: '#1A1A1A',
  mediumGray: '#333333',
  lightGray: '#666666',
  textGray: '#B3B3B3',
  white: '#FFFFFF',
  red: '#E51B23',
  yellow: '#FFDE59',
  green: '#00FF00',
  orange: '#FF9500',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: colors.white,
  },
  // Header
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
  },
  titlePro: {
    color: colors.red,
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.red,
  },
  scoreLabel: {
    fontSize: 8,
    color: colors.lightGray,
    letterSpacing: 1,
  },
  // Snap Take
  snapTake: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 4,
    borderLeftColor: colors.yellow,
    padding: 12,
    marginBottom: 20,
  },
  snapTakeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.yellow,
    marginBottom: 6,
    letterSpacing: 1,
  },
  snapTakeTldr: {
    fontSize: 12,
    color: colors.black,
    marginBottom: 4,
  },
  snapTakeAnalysis: {
    fontSize: 10,
    color: colors.lightGray,
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.yellow,
  },
  // Scores Grid
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  scoreItem: {
    width: '30%',
    marginRight: '3%',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scoreItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.black,
  },
  scoreItemLabel: {
    fontSize: 8,
    color: colors.lightGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Pattern
  patternCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 10,
    marginBottom: 10,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patternName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.red,
  },
  severityBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  severityCritical: {
    backgroundColor: colors.red,
    color: colors.white,
  },
  severityHigh: {
    backgroundColor: colors.orange,
    color: colors.black,
  },
  severityMedium: {
    backgroundColor: colors.yellow,
    color: colors.black,
  },
  severityLow: {
    backgroundColor: colors.mediumGray,
    color: colors.white,
  },
  patternTldr: {
    fontSize: 10,
    color: colors.lightGray,
    marginBottom: 6,
  },
  fixesLabel: {
    fontSize: 8,
    color: colors.lightGray,
    marginTop: 6,
    marginBottom: 4,
  },
  fixItem: {
    fontSize: 9,
    color: colors.textGray,
    marginLeft: 10,
    marginBottom: 2,
  },
  // Tactical Rewrite
  rewriteCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 10,
    marginBottom: 10,
  },
  rewriteContext: {
    fontSize: 8,
    color: colors.lightGray,
    marginBottom: 8,
  },
  rewriteColumns: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rewriteColumn: {
    width: '48%',
    marginRight: '2%',
  },
  rewriteLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rewriteLabelBad: {
    color: colors.red,
  },
  rewriteLabelGood: {
    color: '#16a34a',
  },
  rewriteQuote: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  rewriteQuoteBad: {
    color: colors.lightGray,
  },
  rewriteQuoteGood: {
    color: colors.black,
  },
  rewriteWhy: {
    fontSize: 9,
    color: colors.lightGray,
  },
  // Next Steps
  nextStepItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  nextStepNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.yellow,
    marginRight: 8,
    width: 16,
  },
  nextStepText: {
    fontSize: 10,
    color: colors.textGray,
    flex: 1,
  },
  // Follow-up Email
  emailCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
  },
  emailLabel: {
    fontSize: 8,
    color: colors.lightGray,
    marginBottom: 4,
  },
  emailSubject: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 12,
  },
  emailBody: {
    fontSize: 10,
    color: colors.textGray,
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: colors.lightGray,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: colors.lightGray,
  },
});

interface ProReportProps {
  result: {
    meta?: {
      overallScore?: number;
      repName?: string;
      prospectName?: string;
      prospectCompany?: string;
    };
    snapTake?: { tldr?: string; analysis?: string };
    scores?: Record<string, number>;
    patterns?: Array<{
      patternName?: string;
      severity?: string;
      tldr?: string;
      recommendedFixes?: string[];
    }>;
    tacticalRewrites?: {
      items?: Array<{
        context?: string;
        whatYouSaid?: string;
        whyItMissed?: string;
        strongerAlternative?: string;
      }>;
    };
    nextSteps?: { actions?: string[] };
    followUpEmail?: { subject?: string; body?: string };
    modelScores?: Record<string, {
      score?: number;
      tldr?: string;
      analysis?: string;
      whatWorked?: string[];
      whatMissed?: string[];
      upgradeMove?: string;
    }>;
  };
  metadata?: {
    date?: string;
    repName?: string;
    prospectCompany?: string;
  };
}

const getSeverityStyle = (severity?: string) => {
  const s = (severity || '').toLowerCase();
  if (s === 'critical') return styles.severityCritical;
  if (s === 'high') return styles.severityHigh;
  if (s === 'medium') return styles.severityMedium;
  return styles.severityLow;
};

const formatScoreLabel = (key: string) => {
  return key.replace(/([A-Z])/g, ' $1').trim();
};

export const CallLabProReport: React.FC<ProReportProps> = ({ result, metadata }) => {
  const overallScore = result.meta?.overallScore || 0;

  return (
    <Document>
      {/* Page 1: Header, Snap Take, Scores */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              CALL LAB <Text style={styles.titlePro}>PRO</Text>
            </Text>
            <Text style={{ fontSize: 10, color: colors.lightGray, marginTop: 4 }}>
              Full Diagnostic Report
            </Text>
            {metadata?.date && (
              <Text style={{ fontSize: 8, color: colors.lightGray, marginTop: 2 }}>
                {metadata.date}
              </Text>
            )}
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{overallScore}</Text>
            <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
          </View>
        </View>

        {/* Snap Take */}
        {result.snapTake && (
          <View style={styles.snapTake}>
            <Text style={styles.snapTakeLabel}>SNAP TAKE</Text>
            {result.snapTake.tldr && (
              <Text style={styles.snapTakeTldr}>{result.snapTake.tldr}</Text>
            )}
            {result.snapTake.analysis && (
              <Text style={styles.snapTakeAnalysis}>{result.snapTake.analysis}</Text>
            )}
          </View>
        )}

        {/* Scores Grid */}
        {result.scores && Object.keys(result.scores).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERFORMANCE SCORES</Text>
            <View style={styles.scoresGrid}>
              {Object.entries(result.scores).map(([key, value]) => (
                <View key={key} style={styles.scoreItem}>
                  <Text style={styles.scoreItemValue}>{value}</Text>
                  <Text style={styles.scoreItemLabel}>{formatScoreLabel(key)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Patterns (if they fit) */}
        {result.patterns && result.patterns.length > 0 && result.patterns.length <= 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PATTERNS DETECTED</Text>
            {result.patterns.map((pattern, i) => (
              <View key={i} style={styles.patternCard}>
                <View style={styles.patternHeader}>
                  <Text style={styles.patternName}>{pattern.patternName || 'Unknown Pattern'}</Text>
                  <Text style={[styles.severityBadge, getSeverityStyle(pattern.severity)]}>
                    {(pattern.severity || 'low').toUpperCase()}
                  </Text>
                </View>
                {pattern.tldr && <Text style={styles.patternTldr}>{pattern.tldr}</Text>}
                {pattern.recommendedFixes && pattern.recommendedFixes.length > 0 && (
                  <View>
                    <Text style={styles.fixesLabel}>RECOMMENDED FIXES:</Text>
                    {pattern.recommendedFixes.map((fix, j) => (
                      <Text key={j} style={styles.fixItem}>• {fix}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>Call Lab Pro - Sales Call Analysis Report</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* Page 2: Patterns (if more than 2) */}
      {result.patterns && result.patterns.length > 2 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PATTERNS DETECTED</Text>
            {result.patterns.map((pattern, i) => (
              <View key={i} style={styles.patternCard} wrap={false}>
                <View style={styles.patternHeader}>
                  <Text style={styles.patternName}>{pattern.patternName || 'Unknown Pattern'}</Text>
                  <Text style={[styles.severityBadge, getSeverityStyle(pattern.severity)]}>
                    {(pattern.severity || 'low').toUpperCase()}
                  </Text>
                </View>
                {pattern.tldr && <Text style={styles.patternTldr}>{pattern.tldr}</Text>}
                {pattern.recommendedFixes && pattern.recommendedFixes.length > 0 && (
                  <View>
                    <Text style={styles.fixesLabel}>RECOMMENDED FIXES:</Text>
                    {pattern.recommendedFixes.map((fix, j) => (
                      <Text key={j} style={styles.fixItem}>• {fix}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.footer}>Call Lab Pro - Sales Call Analysis Report</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Page: Model Scores (Challenger, SPIN, MEDDIC, etc.) */}
      {result.modelScores && Object.keys(result.modelScores).length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SALES FRAMEWORK ANALYSIS</Text>
            {Object.entries(result.modelScores).map(([model, data]) => (
              <View key={model} style={styles.patternCard} wrap={false}>
                <View style={styles.patternHeader}>
                  <Text style={styles.patternName}>
                    {model === 'gapSelling' ? 'GAP SELLING' :
                     model === 'buyerJourney' ? 'BUYER JOURNEY' :
                     model === 'wtfMethod' ? 'WTF METHOD' :
                     model.toUpperCase()}
                  </Text>
                  <Text style={[styles.severityBadge, { backgroundColor: colors.red, color: colors.white }]}>
                    {data?.score || 0}
                  </Text>
                </View>
                {data?.tldr && <Text style={{ fontSize: 10, color: colors.yellow, marginBottom: 4 }}>{data.tldr}</Text>}
                {data?.analysis && <Text style={styles.patternTldr}>{data.analysis}</Text>}
                {data?.whatWorked && data.whatWorked.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 8, color: '#16a34a', marginBottom: 2 }}>WHAT WORKED:</Text>
                    {data.whatWorked.slice(0, 3).map((item, j) => (
                      <Text key={j} style={styles.fixItem}>• {item}</Text>
                    ))}
                  </View>
                )}
                {data?.whatMissed && data.whatMissed.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 8, color: colors.red, marginBottom: 2 }}>WHAT MISSED:</Text>
                    {data.whatMissed.slice(0, 3).map((item, j) => (
                      <Text key={j} style={styles.fixItem}>• {item}</Text>
                    ))}
                  </View>
                )}
                {data?.upgradeMove && (
                  <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                    <Text style={{ fontSize: 8, color: colors.lightGray, marginBottom: 2 }}>UPGRADE MOVE:</Text>
                    <Text style={{ fontSize: 9, color: colors.black }}>{data.upgradeMove}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.footer}>Call Lab Pro - Sales Call Analysis Report</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Page: Tactical Rewrites */}
      {result.tacticalRewrites?.items && result.tacticalRewrites.items.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TACTICAL REWRITES</Text>
            {result.tacticalRewrites.items.map((item, i) => (
              <View key={i} style={styles.rewriteCard} wrap={false}>
                {item.context && <Text style={styles.rewriteContext}>{item.context}</Text>}
                <View style={styles.rewriteColumns}>
                  <View style={styles.rewriteColumn}>
                    <Text style={[styles.rewriteLabel, styles.rewriteLabelBad]}>WHAT YOU SAID:</Text>
                    <Text style={[styles.rewriteQuote, styles.rewriteQuoteBad]}>"{item.whatYouSaid}"</Text>
                  </View>
                  <View style={styles.rewriteColumn}>
                    <Text style={[styles.rewriteLabel, styles.rewriteLabelGood]}>STRONGER ALTERNATIVE:</Text>
                    <Text style={[styles.rewriteQuote, styles.rewriteQuoteGood]}>"{item.strongerAlternative}"</Text>
                  </View>
                </View>
                {item.whyItMissed && <Text style={styles.rewriteWhy}>{item.whyItMissed}</Text>}
              </View>
            ))}
          </View>
          <Text style={styles.footer}>Call Lab Pro - Sales Call Analysis Report</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Page 4: Next Steps & Follow-up Email */}
      <Page size="A4" style={styles.page}>
        {/* Next Steps */}
        {result.nextSteps?.actions && result.nextSteps.actions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEXT STEPS</Text>
            {result.nextSteps.actions.map((action, i) => (
              <View key={i} style={styles.nextStepItem}>
                <Text style={styles.nextStepNumber}>{i + 1}.</Text>
                <Text style={styles.nextStepText}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Follow-up Email */}
        {result.followUpEmail?.subject && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FOLLOW-UP EMAIL</Text>
            <View style={styles.emailCard}>
              <Text style={styles.emailLabel}>SUBJECT:</Text>
              <Text style={styles.emailSubject}>{result.followUpEmail.subject}</Text>
              <Text style={styles.emailLabel}>BODY:</Text>
              <Text style={styles.emailBody}>{result.followUpEmail.body}</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>Call Lab Pro - Sales Call Analysis Report</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
};
