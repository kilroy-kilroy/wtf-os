'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AnalysisResult {
  overall_score: number;
  overall_grade: string;
  diagnosis_summary: string;
  scores: Record<string, { score: number; reason: string }>;
  strengths: Array<{ quote: string; behavior: string; note: string }>;
  weaknesses: Array<{ quote: string; behavior: string; note: string }>;
  focus_area: { theme: string; why: string; drill: string };
  follow_ups: Array<{ type: string; subject: string; body: string }>;
  tasks: string[];
}

export default function CallLabPage() {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    transcript: '',
    prospect_company: '',
    prospect_role: '',
    call_stage: 'discovery',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Ingest transcript
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

      // Step 2: Analyze call
      const analyzeResponse = await fetch('/api/analyze/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingestion_item_id: ingestData.ingestion_item_id,
          tool_run_id: ingestData.tool_run_id,
          rep_name: formData.first_name || 'Sales Rep',
          version: 'lite',
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Failed to analyze call');
      }

      const analyzeData = await analyzeResponse.json();
      setResult(analyzeData.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white">Call Lab Lite</h1>
          <p className="text-xl text-slate-300">
            Get instant feedback on your sales calls
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
                  {loading ? 'Analyzing...' : 'Analyze Call'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Results Display */
          <div className="space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Overall Grade: {result.overall_grade}</CardTitle>
                  <span
                    className={`text-4xl font-bold ${getScoreColor(result.overall_score)}`}
                  >
                    {result.overall_score.toFixed(1)}/5
                  </span>
                </div>
                <CardDescription>{result.diagnosis_summary}</CardDescription>
              </CardHeader>
            </Card>

            {/* Category Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Category Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(result.scores).map(([category, data]) => (
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

            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✓ Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.strengths.map((strength, idx) => (
                    <div key={idx} className="border-l-4 border-green-500 pl-4">
                      <p className="text-sm italic text-muted-foreground mb-2">
                        &ldquo;{strength.quote}&rdquo;
                      </p>
                      <p className="text-sm font-medium">{strength.behavior}</p>
                      <p className="text-sm text-muted-foreground">{strength.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">⚠ Areas to Improve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.weaknesses.map((weakness, idx) => (
                    <div key={idx} className="border-l-4 border-orange-500 pl-4">
                      <p className="text-sm italic text-muted-foreground mb-2">
                        &ldquo;{weakness.quote}&rdquo;
                      </p>
                      <p className="text-sm font-medium">{weakness.behavior}</p>
                      <p className="text-sm text-muted-foreground">{weakness.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Focus Area */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Primary Focus Area</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg">{result.focus_area.theme}</h4>
                  <p className="text-sm text-muted-foreground">
                    {result.focus_area.why}
                  </p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <p className="text-sm font-medium">Practice Drill:</p>
                    <p className="text-sm">{result.focus_area.drill}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Follow-up Emails */}
            <Card>
              <CardHeader>
                <CardTitle>📧 Suggested Follow-up Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {result.follow_ups.map((followUp, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium uppercase text-muted-foreground">
                          {followUp.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="font-semibold">Subject: {followUp.subject}</p>
                      <div className="bg-slate-50 p-4 rounded-md">
                        <pre className="text-sm whitespace-pre-wrap font-sans">
                          {followUp.body}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            {result.tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>✓ Action Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tasks.map((task, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span className="text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* New Analysis Button */}
            <Button
              onClick={() => {
                setResult(null);
                setFormData({
                  email: formData.email,
                  first_name: formData.first_name,
                  last_name: formData.last_name,
                  transcript: '',
                  prospect_company: '',
                  prospect_role: '',
                  call_stage: 'discovery',
                });
              }}
              className="w-full"
              size="lg"
            >
              Analyze Another Call
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
