'use client';

import React, { useState, useEffect } from 'react';

interface CallLabLoadingScreenProps {
  step: 'uploading' | 'analyzing';
  tier?: 'lite' | 'pro';
}

export const CallLabLoadingScreen: React.FC<CallLabLoadingScreenProps> = ({
  step,
  tier = 'lite'
}) => {
  const [logIndex, setLogIndex] = useState(0);
  const [glitchText, setGlitchText] = useState('');

  const uploadLogs = [
    "INITIALIZING CALL_LAB KERNEL...",
    "ESTABLISHING SECURE CONNECTION...",
    "PARSING TRANSCRIPT FORMAT...",
    "TRANSCRIPT UPLOADED SUCCESSFULLY",
  ];

  const analyzeLogs = tier === 'pro' ? [
    "LOADING PATTERN RECOGNITION ENGINE...",
    "SCANNING FOR BUY SIGNALS...",
    "MAPPING TRUST TRAJECTORY...",
    "DETECTING OBJECTION PATTERNS...",
    "ANALYZING CLOSING SEQUENCES...",
    "COMPARING AGAINST 8 SALES FRAMEWORKS...",
    "IDENTIFYING MISSED OPPORTUNITIES...",
    "CALCULATING TRUST PEAKS...",
    "GENERATING TACTICAL REWRITES...",
    "COMPILING STRATEGIC PROTOCOL...",
    "FINALIZING PRO DIAGNOSTIC..."
  ] : [
    "LOADING PATTERN RECOGNITION ENGINE...",
    "SCANNING FOR BUY SIGNALS...",
    "DETECTING OBJECTION PATTERNS...",
    "ANALYZING CLOSING SEQUENCES...",
    "MAPPING TRUST TRAJECTORY...",
    "IDENTIFYING CRITICAL MOMENTS...",
    "CALCULATING EFFECTIVENESS SCORE...",
    "GENERATING DIAGNOSTIC SNAPSHOT...",
    "FINALIZING REPORT..."
  ];

  const logs = step === 'uploading' ? uploadLogs : analyzeLogs;

  // Glitch effect text options
  const glitchOptions = [
    "CLOSE_RATE++",
    "TRUST.BUILD()",
    "SIGNAL.DETECT",
    "PATTERN.MATCH",
    "OBJECTION.FLIP",
    "DEAL.ACCELERATE",
  ];

  useEffect(() => {
    // Progress through logs
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev < logs.length - 1 ? prev + 1 : prev));
    }, step === 'uploading' ? 800 : 1200);
    return () => clearInterval(interval);
  }, [logs.length, step]);

  useEffect(() => {
    // Random glitch text
    const glitchInterval = setInterval(() => {
      setGlitchText(glitchOptions[Math.floor(Math.random() * glitchOptions.length)]);
    }, 150);
    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8 font-mono">
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(229, 27, 35, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(229, 27, 35, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridPulse 4s ease-in-out infinite',
        }}
      />

      <div className="w-full max-w-lg space-y-6 relative z-10">

        {/* Glowing Icon */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-[#E51B23] blur-3xl opacity-20 animate-pulse" />
          <div className="relative">
            {/* Rotating outer ring */}
            <div
              className="w-24 h-24 border-2 border-[#E51B23] rounded-full absolute -inset-2"
              style={{ animation: 'spin 3s linear infinite' }}
            />
            {/* Pulsing inner circle */}
            <div className="w-20 h-20 bg-gradient-to-br from-[#E51B23] to-[#8B0000] rounded-full flex items-center justify-center animate-pulse">
              <span className="text-4xl">
                {step === 'uploading' ? '↑' : '⚡'}
              </span>
            </div>
            {/* Glitch text overlay */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[#E51B23] text-xs tracking-widest opacity-50 font-mono whitespace-nowrap">
              {glitchText}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="font-anton text-2xl tracking-[4px] text-white">
            CALL LAB <span className="text-[#E51B23]">{tier.toUpperCase()}</span>
          </h2>
          <p className="text-[#666] text-sm tracking-widest mt-2">
            {step === 'uploading' ? 'UPLOADING TRANSCRIPT' : 'ANALYZING CALL'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-[#1A1A1A] border border-[#333] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E51B23] to-[#FFDE59] transition-all duration-700 ease-out relative"
            style={{ width: `${((logIndex + 1) / logs.length) * 100}%` }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ animation: 'shimmer 1.5s infinite' }}
            />
          </div>
        </div>

        {/* Percentage */}
        <div className="text-center text-[#FFDE59] text-sm font-mono tracking-widest">
          {Math.round(((logIndex + 1) / logs.length) * 100)}% COMPLETE
        </div>

        {/* Terminal Output */}
        <div className="bg-[#0D0D0D] border border-[#333] p-4 font-mono text-xs h-56 overflow-hidden flex flex-col justify-end relative">
          {/* Terminal header */}
          <div className="absolute top-0 left-0 right-0 bg-[#1A1A1A] border-b border-[#333] px-3 py-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E51B23]" />
            <div className="w-2 h-2 rounded-full bg-[#FFDE59]" />
            <div className="w-2 h-2 rounded-full bg-[#333]" />
            <span className="text-[#666] text-[10px] ml-2 tracking-wider">CALL_LAB_TERMINAL</span>
          </div>

          <div className="mt-6 space-y-1">
            {logs.slice(0, logIndex + 1).map((log, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 transition-all duration-300 ${
                  i === logIndex
                    ? 'text-[#FFDE59]'
                    : 'text-[#4A4A4A]'
                }`}
              >
                <span className="text-[#E51B23] opacity-70">{`>`}</span>
                <span className={i === logIndex ? 'animate-pulse' : ''}>{log}</span>
                {i === logIndex && <span className="animate-pulse">_</span>}
              </div>
            ))}
          </div>

          {/* Active processing indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-[#E51B23] animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-3 bg-[#E51B23] animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-3 bg-[#E51B23] animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[#E51B23] animate-pulse tracking-widest">PROCESSING</span>
          </div>
        </div>

        {/* Warning text */}
        <div className="text-center text-[#4A4A4A] text-[10px] uppercase tracking-[3px]">
          Do not close this window
        </div>

        {/* Fun stats ticker */}
        <div className="flex justify-center gap-8 text-[10px] text-[#333] tracking-wider">
          <span>PATTERNS: <span className="text-[#E51B23]">47</span></span>
          <span>SIGNALS: <span className="text-[#FFDE59]">SCANNING</span></span>
          <span>TRUST: <span className="text-[#E51B23]">MAPPING</span></span>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes gridPulse {
          0%, 100% { opacity: 0.02; }
          50% { opacity: 0.05; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CallLabLoadingScreen;
