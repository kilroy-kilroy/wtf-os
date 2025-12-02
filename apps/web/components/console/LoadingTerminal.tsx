'use client';

import { useEffect, useState } from 'react';

const loadingMessages = [
  'Initializing analysis engine...',
  'Parsing transcript structure...',
  'Identifying speaker patterns...',
  'Mapping conversation flow...',
  'Detecting trust signals...',
  'Analyzing objection handling...',
  'Evaluating discovery depth...',
  'Measuring agenda control...',
  'Calculating pattern density...',
  'Scoring WTF Method alignment...',
  'Generating tactical recommendations...',
  'Building your diagnostic report...',
];

interface LoadingTerminalProps {
  step: 'uploading' | 'analyzing';
}

export function LoadingTerminal({ step }: LoadingTerminalProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (step === 'uploading') {
      setLines(['> Uploading transcript...']);
      return;
    }

    // Start with first message
    setLines(['> ' + loadingMessages[0]]);
    setCurrentIndex(0);

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= loadingMessages.length) {
          // Loop back or stay at end
          return loadingMessages.length - 1;
        }
        return next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step === 'analyzing' && currentIndex > 0) {
      setLines(prev => [...prev.slice(-5), '> ' + loadingMessages[currentIndex]]);
    }
  }, [currentIndex, step]);

  return (
    <div className="bg-black border border-[#333] rounded-lg p-6 font-mono text-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#333]">
        <div className="w-3 h-3 rounded-full bg-[#E51B23]"></div>
        <div className="w-3 h-3 rounded-full bg-[#FFDE59]"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="ml-2 text-[#666] text-xs">CALL LAB PRO - ANALYSIS IN PROGRESS</span>
      </div>
      <div className="space-y-1 min-h-[150px]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${i === lines.length - 1 ? 'text-[#FFDE59]' : 'text-[#666]'} transition-colors duration-300`}
          >
            {line}
            {i === lines.length - 1 && (
              <span className="inline-block w-2 h-4 bg-[#FFDE59] ml-1 animate-pulse"></span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[#333] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#FFDE59] animate-pulse"></div>
        <span className="text-[#B3B3B3] text-xs">
          {step === 'uploading' ? 'Uploading...' : 'Processing with Claude AI...'}
        </span>
      </div>
    </div>
  );
}
