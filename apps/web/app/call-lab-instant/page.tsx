'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Scenario = 'discovery' | 'value_prop' | 'pricing' | 'objection';
type RecordingState = 'idle' | 'recording' | 'processing' | 'results' | 'capturing';

interface WtfScores {
  radicalRelevance: number;
  radicalRelevanceNote: string;
  radicalRelevanceEvidence?: string;
  diagnosticGenerosity: number;
  diagnosticGenerosityNote: string;
  diagnosticGenerosityEvidence?: string;
  permissionProgression: number;
  permissionProgressionNote: string;
  permissionProgressionEvidence?: string;
  overall: string;
}

interface TechnicalScores {
  talkRatio?: string;
  questionQuality?: number;
  activeListening?: number;
}

interface AnalysisResult {
  reportId: string;
  transcript: string;
  score: number;
  analysis: {
    wtf?: WtfScores;
    technical?: TechnicalScores;
    summary: string;
    what_worked: string[];
    what_to_watch: string[];
    one_move: string;
  };
}

export default function CallLabInstantPage() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedScenarioRef = useRef<Scenario | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedScenarioRef.current = selectedScenario;
  }, [selectedScenario]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setRecordingState('processing');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('duration', '90');
      if (selectedScenarioRef.current) {
        formData.append('scenario', selectedScenarioRef.current);
      }

      const response = await fetch('/api/call-lab-instant/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult({
        reportId: data.reportId,
        transcript: data.transcript,
        score: data.score,
        analysis: data.analysis,
      });
      setRecordingState('results');
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze recording');
      setRecordingState('idle');
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      setEmailSuccess(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setSecondsLeft(90);

      // Countdown timer
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-stop after 90 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 90000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  }, [processAudio, stopRecording]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !email) return;

    setRecordingState('capturing');

    try {
      const response = await fetch('/api/call-lab-instant/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reportId: result.reportId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save email');
      }

      setEmailSuccess(true);
      setRecordingState('results');
    } catch (err) {
      console.error('Error capturing email:', err);
      setError(err instanceof Error ? err.message : 'Failed to save email');
      setRecordingState('results');
    }
  };

  const resetRecorder = () => {
    setRecordingState('idle');
    setResult(null);
    setError(null);
    setEmail('');
    setEmailSuccess(false);
    setSecondsLeft(90);
  };

  const scenarios = [
    { id: 'value_prop' as Scenario, title: 'Give your 90-second elevator pitch', desc: 'The quick version of what you do and who you help' },
    { id: 'pricing' as Scenario, title: 'Present your core offer', desc: 'Walk through your main service offering' },
    { id: 'objection' as Scenario, title: 'Handle this objection: "I need to think about it"', desc: 'Show us how you respond when they hesitate' },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-poppins">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-anton text-xl tracking-wider">
            SALES<span className="text-[#E51B23]">OS</span>
          </span>
          <span className="text-white/50">/</span>
          <span className="text-white/70">Call Lab</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto">
        <div className="w-full bg-white/5 border-2 border-[#E51B23]/30 rounded-xl p-8 md:p-12">

          {/* Title */}
          <h1 className="font-anton text-4xl md:text-5xl text-center mb-3 tracking-wide">
            <span className="text-[#FFDE59]">RECORD</span> YOUR PITCH
          </h1>
          <p className="text-white/70 text-center mb-8 text-lg">
            Hit the button and deliver your best 90-second sales pitch.
            We&apos;ll analyze it and show you exactly what you&apos;re missing.
          </p>

          {/* Scenario Selection */}
          {recordingState === 'idle' && (
            <div className="mb-8 p-6 bg-[#FFDE59]/10 border-l-4 border-[#FFDE59]">
              <h3 className="font-bold text-[#FFDE59] mb-3">Pick A Scenario:</h3>
              <div className="space-y-3">
                {scenarios.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 cursor-pointer p-3 rounded transition-colors ${
                      selectedScenario === s.id
                        ? 'bg-[#E51B23]/20 border border-[#E51B23]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scenario"
                      value={s.id}
                      checked={selectedScenario === s.id}
                      onChange={() => setSelectedScenario(s.id)}
                      className="mt-1 accent-[#E51B23]"
                    />
                    <div>
                      <span className="font-semibold text-white">{s.title}</span>
                      <span className="text-white/60 ml-2">{s.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-white/50 text-sm mt-3 italic">
                Record whichever one you struggle with most.
              </p>
            </div>
          )}

          {/* Recorder Section */}
          <div className="flex flex-col items-center my-8">
            {/* Record Button */}
            <button
              onClick={recordingState === 'recording' ? stopRecording : startRecording}
              disabled={recordingState === 'processing' || recordingState === 'capturing'}
              className={`
                w-36 h-36 rounded-full relative transition-all duration-300
                ${recordingState === 'recording'
                  ? 'bg-[#FFDE59] animate-pulse'
                  : 'bg-[#E51B23] hover:scale-105 hover:shadow-[0_8px_32px_rgba(229,27,35,0.6)]'
                }
                ${(recordingState === 'processing' || recordingState === 'capturing') && 'opacity-50 cursor-not-allowed'}
                shadow-[0_8px_32px_rgba(229,27,35,0.4)]
              `}
            >
              <div
                className={`
                  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  ${recordingState === 'recording'
                    ? 'w-12 h-12 rounded-lg bg-[#E51B23]'
                    : 'w-14 h-14 rounded-full bg-white'
                  }
                `}
              />
            </button>

            {/* Timer */}
            {recordingState === 'recording' && (
              <div className="font-anton text-5xl text-[#FFDE59] mt-6">
                {secondsLeft}s
              </div>
            )}

            {/* Status */}
            <div className="text-white/70 mt-4 h-8 text-center">
              {recordingState === 'idle' && 'Click to start recording'}
              {recordingState === 'recording' && 'Recording... Click to stop early'}
              {recordingState === 'processing' && (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing your pitch...
                </span>
              )}
              {recordingState === 'capturing' && 'Saving your email...'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#E51B23]/20 border border-[#E51B23] text-white p-4 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          {/* Results */}
          {(recordingState === 'results' || recordingState === 'capturing') && result && (
            <div className="mt-8 space-y-6">
              {/* Score Card */}
              <div className="p-6 bg-white/5 border-2 border-[#E51B23] rounded-xl text-center">
                <div className="inline-block bg-[#E51B23] text-white px-6 py-3 rounded-lg mb-3">
                  <span className="font-anton text-4xl">{result.score}</span>
                  <span className="text-xl">/10</span>
                </div>
                <p className="text-white/80">{result.analysis.summary}</p>
              </div>

              {/* WTF Method Assessment - PROMINENT */}
              {result.analysis.wtf && (
                <div className="p-6 bg-[#1a1a1a] border-l-4 border-[#E51B23] rounded-r">
                  <h3 className="font-anton text-xl text-[#E51B23] mb-4 tracking-wide">
                    WTF SALES METHOD ASSESSMENT
                  </h3>

                  {/* WTF Scores Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Radical Relevance */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#E51B23]">
                        {result.analysis.wtf.radicalRelevance}/10
                      </div>
                      <div className="text-xs text-white/70 mt-1">Radical Relevance</div>
                    </div>

                    {/* Diagnostic Generosity */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#E51B23]">
                        {result.analysis.wtf.diagnosticGenerosity}/10
                      </div>
                      <div className="text-xs text-white/70 mt-1">Diagnostic Generosity</div>
                    </div>

                    {/* Permission-Based Progression */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#E51B23]">
                        {result.analysis.wtf.permissionProgression}/10
                      </div>
                      <div className="text-xs text-white/70 mt-1">Permission Progression</div>
                    </div>
                  </div>

                  {/* WTF Overall */}
                  <div className="bg-black/40 rounded p-3 text-sm text-white/80">
                    <strong className="text-white">Overall:</strong> {result.analysis.wtf.overall}
                  </div>
                </div>
              )}

              {/* Technical Scores */}
              {result.analysis.technical && (
                <div className="grid grid-cols-3 gap-3">
                  {result.analysis.technical.talkRatio && (
                    <div className="bg-white/5 rounded p-3 text-center">
                      <div className="text-lg font-bold text-[#FFDE59]">{result.analysis.technical.talkRatio}</div>
                      <div className="text-xs text-white/50">Talk Ratio</div>
                    </div>
                  )}
                  {result.analysis.technical.questionQuality !== undefined && (
                    <div className="bg-white/5 rounded p-3 text-center">
                      <div className="text-lg font-bold text-[#FFDE59]">{result.analysis.technical.questionQuality}/10</div>
                      <div className="text-xs text-white/50">Question Quality</div>
                    </div>
                  )}
                  {result.analysis.technical.activeListening !== undefined && (
                    <div className="bg-white/5 rounded p-3 text-center">
                      <div className="text-lg font-bold text-[#FFDE59]">{result.analysis.technical.activeListening}/10</div>
                      <div className="text-xs text-white/50">Active Listening</div>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript */}
              <div className="p-6 bg-white/5 border-l-4 border-[#E51B23]">
                <h3 className="font-anton text-xl text-[#FFDE59] mb-3 tracking-wide">
                  YOUR TRANSCRIPT
                </h3>
                <p className="text-white/80 leading-relaxed">{result.transcript}</p>
              </div>

              {/* What Worked & What to Watch */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* What Worked */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">+</span> What Worked
                  </h4>
                  <ul className="space-y-2">
                    {result.analysis.what_worked.map((item, i) => (
                      <li key={i} className="text-white/80 text-sm pl-3 border-l-2 border-green-400/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What to Watch */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">-</span> What to Watch
                  </h4>
                  <ul className="space-y-2">
                    {result.analysis.what_to_watch.map((item, i) => (
                      <li key={i} className="text-white/80 text-sm pl-3 border-l-2 border-orange-400/50">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* One Move */}
              <div className="bg-[#FFDE59]/10 p-4 border-l-4 border-[#FFDE59] rounded-r">
                <h4 className="text-[#FFDE59] font-semibold mb-2">Your One Move:</h4>
                <p className="text-white/90">{result.analysis.one_move}</p>
              </div>

              {/* Email Capture CTA */}
              {!emailSuccess ? (
                <div className="bg-[#E51B23] p-8 rounded-lg text-center">
                  <h3 className="font-anton text-2xl mb-2 tracking-wide">
                    GET THIS REPORT + OUR WTF SALES GUIDE
                  </h3>
                  <p className="text-white/90 mb-6">
                    We&apos;ll email you the full analysis plus our 3-pillar framework for trust-based selling
                    (the layer every other sales methodology skips).
                  </p>
                  <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1 px-4 py-3 rounded bg-white text-black placeholder-gray-500 font-poppins"
                    />
                    <button
                      type="submit"
                      disabled={recordingState === 'capturing'}
                      className="bg-black text-white px-6 py-3 rounded font-bold uppercase tracking-wide hover:bg-[#FFDE59] hover:text-black transition-colors disabled:opacity-50"
                    >
                      Get My Report
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-green-600/20 border border-green-500 p-6 rounded-lg text-center">
                  <h3 className="font-anton text-xl text-green-400 mb-2">CHECK YOUR EMAIL!</h3>
                  <p className="text-white/80">
                    We&apos;ve sent your report and the WTF Sales Guide to <strong>{email}</strong>
                  </p>
                  <p className="text-white/60 mt-4">
                    <a
                      href={`/call-lab-instant/report/${result.reportId}`}
                      className="text-[#FFDE59] underline"
                    >
                      View Your Report →
                    </a>
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
