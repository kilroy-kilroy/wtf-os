'use client';

import { useState, useRef } from 'react';

export default function QuickAnalyzePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<{
    transcript: string;
    analysis: string;
    score: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      setResults(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording... Click to stop early');

      let seconds = 30;
      setSecondsLeft(seconds);

      countdownRef.current = setInterval(() => {
        seconds--;
        setSecondsLeft(seconds);
        if (seconds <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);

      timerRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus('Analyzing your pitch...');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/analyze-quick', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();

      setResults({
        transcript: data.transcript,
        analysis: data.analysis,
        score: data.score,
      });
      setStatus('');
      setSecondsLeft(30);
    } catch (err) {
      setError('Failed to analyze your recording. Please try again.');
      console.error('Error processing audio:', err);
      setStatus('');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
    const email = emailInput.value;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'quick-analyze',
          transcript: results?.transcript,
          score: results?.score,
        }),
      });

      if (response.ok) {
        window.location.href = '/call-lab-pro';
      }
    } catch (err) {
      setError('Failed to save your email. Please try again.');
      console.error('Error capturing email:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-[Poppins]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap');
      `}</style>

      <header className="p-6 border-b border-white/10">
        <div className="font-[Anton] text-2xl">
          SALES<span className="text-[#E51B23]">OS</span> / Call Lab
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-8 max-w-[900px] mx-auto w-full">
        <div className="bg-white/5 border-2 border-[#E51B23]/30 rounded-xl p-12 w-full text-center">
          <h1 className="font-[Anton] text-4xl md:text-5xl uppercase mb-4">
            <span className="text-[#FFDE59]">Record</span> Your Pitch
          </h1>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Hit the button and deliver your best 30-second sales pitch. We&apos;ll analyze it and
            show you exactly what you&apos;re missing.
          </p>

          <div className="my-8 p-6 bg-[#FFDE59]/10 border-l-4 border-[#FFDE59] text-left">
            <div className="font-bold text-[#FFDE59] mb-2">Pick A Scenario:</div>
            <div className="text-white/90 leading-relaxed">
              <ul className="list-none space-y-2 mb-4">
                <li><strong>Discovery Call Opener:</strong> &ldquo;So tell me about your agency...&rdquo;</li>
                <li><strong>Value Prop Pitch:</strong> &ldquo;Here&apos;s how we help agencies like yours...&rdquo;</li>
                <li><strong>Pricing Presentation:</strong> &ldquo;Our engagement typically runs...&rdquo;</li>
                <li><strong>Objection Response:</strong> &ldquo;We need to think about it...&rdquo; → You say...</li>
              </ul>
              <p className="text-white/70">
                Try one of those or just launch into your elevator pitch...whatever you want to get some real, actionable feedback on...
              </p>
            </div>
          </div>

          <div className="my-8">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={status === 'Analyzing your pitch...'}
              className={`w-[150px] h-[150px] rounded-full border-none cursor-pointer relative transition-all duration-300 shadow-[0_8px_32px_rgba(229,27,35,0.4)] disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? 'bg-[#FFDE59] animate-pulse'
                  : 'bg-[#E51B23] hover:scale-105 hover:shadow-[0_12px_48px_rgba(229,27,35,0.6)]'
              }`}
            >
              <div
                className={`mx-auto transition-all ${
                  isRecording
                    ? 'w-[50px] h-[50px] bg-[#E51B23] rounded-lg'
                    : 'w-[60px] h-[60px] bg-white rounded-full'
                }`}
              />
            </button>
            <div className="font-[Anton] text-5xl text-[#FFDE59] mt-6 min-h-[4rem]">
              {isRecording ? `${secondsLeft}s` : ''}
            </div>
            <div className="text-xl mt-4 min-h-[2rem]">{status}</div>
          </div>

          {results && (
            <div className="mt-8 text-left">
              <div className="mb-8 p-6 bg-white/5 border-l-4 border-[#E51B23]">
                <div className="font-[Anton] text-2xl text-[#FFDE59] uppercase mb-4">
                  Your Transcript
                </div>
                <div className="text-white/90 leading-relaxed">{results.transcript}</div>
              </div>

              <div className="mb-8 p-6 bg-white/5 border-l-4 border-[#E51B23]">
                <div className="font-[Anton] text-2xl text-[#FFDE59] uppercase mb-4">
                  Call Lab Analysis
                </div>
                <div className="inline-block px-4 py-2 bg-[#E51B23] rounded font-bold text-xl mb-4">
                  Score: {results.score}/10
                </div>
                <div
                  className="text-white/90 leading-relaxed [&_p]:mb-4 [&_strong]:text-[#FFDE59] [&_ul]:list-disc [&_ul]:ml-6 [&_li]:mb-2"
                  dangerouslySetInnerHTML={{ __html: results.analysis }}
                />
              </div>

              <div className="mt-12 p-8 bg-[#E51B23] rounded-lg text-center">
                <h3 className="font-[Anton] text-3xl uppercase mb-4">
                  Want To Analyze Your Real Sales Calls?
                </h3>
                <p className="text-lg mb-6">
                  Get Call Lab Pro and never guess why deals don&apos;t close.
                </p>
                <form onSubmit={handleEmailSubmit} className="flex gap-4 max-w-[500px] mx-auto flex-col sm:flex-row">
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    required
                    className="flex-1 p-4 text-base border-none rounded text-black font-[Poppins]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-black text-white border-none rounded font-bold uppercase cursor-pointer transition-all hover:bg-[#FFDE59] hover:text-black disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Get Access'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-[#E51B23]/10 text-[#E51B23] rounded">{error}</div>
          )}
        </div>
      </main>
    </div>
  );
}
