'use client';

import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

const LOADING_LOGS = [
  "INITIALIZING VISIBILITY LAB PRO ENGINE...",
  "CONNECTING TO PERPLEXITY NEURAL GRID...",
  "EXECUTING LIVE COMPETITOR RESEARCH...",
  "SCANNING OPERATOR DIGITAL FOOTPRINT...",
  "AUDITING BRAND NARRATIVE ACROSS CHANNELS...",
  "MAPPING BUYER JOURNEY VISIBILITY...",
  "CALCULATING KILROY VISIBILITY INDEX...",
  "BUILDING COMPETITOR WAR ROOM...",
  "ANALYZING CONTENT INTELLIGENCE...",
  "PROFILING OPERATOR VISIBILITY...",
  "GENERATING 90-DAY BATTLE PLAN...",
  "COMPILING KILROY'S HOT TAKE...",
  "FINALIZING PRO REPORT..."
];

export const ProLoadingScreen: React.FC = () => {
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev < LOADING_LOGS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8 font-mono">
      <div className="w-full max-w-md space-y-6">

        {/* Icon Animation */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-[#E51B23] blur-2xl opacity-20 animate-pulse"></div>
          <Cpu size={64} className="text-[#E51B23] animate-bounce" />
        </div>

        {/* Pro Badge */}
        <div className="text-center mb-4">
          <span className="font-anton text-2xl text-white uppercase tracking-widest">VISIBILITY LAB</span>
          <span className="ml-2 font-anton text-2xl text-[#FFDE59] uppercase">PRO</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-900 border border-gray-800">
          <div
            className="h-full bg-[#E51B23] transition-all duration-500 ease-out"
            style={{ width: `${((logIndex + 1) / LOADING_LOGS.length) * 100}%` }}
          ></div>
        </div>

        {/* Terminal Output */}
        <div className="bg-gray-900/50 border border-gray-800 p-4 font-mono text-xs h-64 overflow-hidden flex flex-col justify-end">
          {LOADING_LOGS.slice(0, logIndex + 1).map((log, i) => (
            <div key={i} className={`mb-1 flex items-center gap-2 ${i === logIndex ? 'text-[#FFDE59] animate-pulse' : 'text-gray-500'}`}>
              <span className="opacity-50">{`>`}</span> {log}
            </div>
          ))}
          <div className="text-[#E51B23] animate-pulse mt-2">_DEEP ANALYSIS IN PROGRESS</div>
        </div>

        <div className="text-center space-y-1">
          <div className="text-gray-600 text-xs uppercase tracking-widest">
            Pro analysis takes 30-60 seconds
          </div>
          <div className="text-gray-700 text-xs">
            Do not close this window
          </div>
        </div>

      </div>
    </div>
  );
};
