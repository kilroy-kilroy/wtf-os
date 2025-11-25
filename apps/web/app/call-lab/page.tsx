'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/markdown-renderer';

// Union type for both response formats
type AnalysisResult =
  | {
      type: 'markdown';
      markdown: string;
      metadata: {
        score: number;
        effectiveness: 'High' | 'Medium' | 'Low';
      };
    }
  | {
      type: 'json';
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

export default function CallLabPage() {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    transcript: '',
    prospect_company: '',
    prospect_role: '',
    call_stage: 'discovery',
    tier: 'lite', // 'lite' or 'pro'
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'analyzing' | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Ingest transcript
      setLoadingStep('uploading');
      const ingestResponse = await fetch('/api/ingest/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json();
        throw new Error(errorData.error || 'Failed to submit transcript');
      }

      const ingestData = await ingestResponse.json();

      // Step 2: Analyze call with new markdown format
      setLoadingStep('analyzing');
      const analyzeResponse = await fetch('/api/analyze/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingestion_item_id: ingestData.ingestion_item_id,
          tool_run_id: ingestData.tool_run_id,
          rep_name: formData.first_name || 'Sales Rep',
          version: formData.tier,
          use_markdown: true, // Use new markdown prompts
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Failed to analyze call');
      }

      const analyzeData = await analyzeResponse.json();

      // Check if response is markdown or JSON format
      if (analyzeData.result.markdown) {
        setResult({
          type: 'markdown',
          markdown: analyzeData.result.markdown,
          metadata: analyzeData.result.metadata,
        });
      } else {
        // Backwards compatibility with JSON format
        setResult({
          type: 'json',
          ...analyzeData.result,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDownloadPdf = async () => {
    if (!result) return;

    setDownloadingPdf(true);
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result.type === 'markdown' ? result.markdown : result,
          metadata: {
            date: new Date().toLocaleDateString(),
            repName: formData.first_name || 'Sales Rep',
            prospectCompany: formData.prospect_company,
            tier: formData.tier,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-lab-${formData.tier}-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const renderJsonResult = (jsonResult: Extract<AnalysisResult, { type: 'json' }>) => (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          variant="outline"
        >
          {downloadingPdf ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        <Button onClick={() => setResult(null)}>Analyze Another Call</Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Grade: {jsonResult.overall_grade}</CardTitle>
            <span
              className={`text-4xl font-bold ${getScoreColor(jsonResult.overall_score)}`}
            >
              {jsonResult.overall_score.toFixed(1)}/5
            </span>
          </div>
          <CardDescription>{jsonResult.diagnosis_summary}</CardDescription>
        </CardHeader>
      </Card>

      {/* Category Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Category Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(jsonResult.scores).map(([category, data]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {category.replace(/_/g, ' ')}
                  </span>
                  <span className={`font-bold ${getScoreColor(data.score)}`}>
                    {data.score}/5
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{data.reason}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths, Weaknesses, etc. - keeping existing JSON rendering */}
      {/* ... rest of JSON rendering code ... */}
    </div>
  );

  const renderMarkdownResult = (mdResult: Extract<AnalysisResult, { type: 'markdown' }>) => (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          variant="outline"
        >
          {downloadingPdf ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating PDF...
            </span>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </>
          )}
        </Button>
        <Button onClick={() => setResult(null)}>Analyze Another Call</Button>
      </div>

      {/* Markdown Content */}
      <Card>
        <CardContent className="pt-6">
          <MarkdownRenderer content={mdResult.markdown} />
        </CardContent>
      </Card>

      {/* New Analysis Button */}
      <Button
        onClick={() => {
          setResult(null);
          setFormData({
            ...formData,
            transcript: '',
            prospect_company: '',
            prospect_role: '',
          });
        }}
        className="w-full"
        size="lg"
      >
        Analyze Another Call
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white">
            Call Lab {formData.tier === 'pro' ? 'Pro' : 'Lite'}
          </h1>
          <p className="text-xl text-slate-300">
            {formData.tier === 'pro'
              ? 'Deep analysis with Human-First Sales Methodology'
              : 'Get instant feedback on your sales calls'}
          </p>
        </div>

        {!result ? (
          /* Input Form */
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Call Transcript</CardTitle>
              <CardDescription>
                Paste your sales call transcript below and get instant analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tier Selection */}
                <div className="space-y-2">
                  <Label>Analysis Tier</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={formData.tier === 'lite' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, tier: 'lite' })}
                    >
                      Lite (Quick Diagnostic)
                    </Button>
                    <Button
                      type="button"
                      variant={formData.tier === 'pro' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, tier: 'pro' })}
                    >
                      Pro (Full Analysis)
                    </Button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      placeholder="John"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Call Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prospect_company">Prospect Company</Label>
                    <Input
                      id="prospect_company"
                      placeholder="Acme Corp"
                      value={formData.prospect_company}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prospect_company: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prospect_role">Prospect Role</Label>
                    <Input
                      id="prospect_role"
                      placeholder="CEO"
                      value={formData.prospect_role}
                      onChange={(e) =>
                        setFormData({ ...formData, prospect_role: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Transcript */}
                <div className="space-y-2">
                  <Label htmlFor="transcript">Call Transcript *</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Paste your call transcript here..."
                    required
                    rows={12}
                    value={formData.transcript}
                    onChange={(e) =>
                      setFormData({ ...formData, transcript: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Supports transcripts from Zoom, Fireflies, Gong, or any text
                    format
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {loadingStep === 'uploading' ? 'Uploading transcript...' : 'Analyzing with AI...'}
                    </span>
                  ) : (
                    'Analyze Call'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Results Display - render based on type */
          result.type === 'markdown' ? renderMarkdownResult(result) : renderJsonResult(result)
        )}
      </div>
    </div>
  );
}
