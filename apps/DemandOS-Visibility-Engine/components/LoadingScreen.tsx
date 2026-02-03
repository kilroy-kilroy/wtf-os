
import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Shield, Cpu } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  const [logIndex, setLogIndex] = useState(0);
  const logs = [
    "INITIALIZING DEMAND_OS KERNEL...",
    "CONNECTING TO NEURAL GRID...",
    "PARSING BRAND SIGNAL...",
    "DETECTING COMPETITOR PATTERNS...",
    "ANALYZING VISIBILITY LEAKS...",
    "CALCULATING OPPORTUNITY SCORES...",
    "SYNTHESIZING STRATEGIC PROTOCOL...",
    "FINALIZING REPORT..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev < logs.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8 font-mono">
      <div className="w-full max-w-md space-y-6">
        
        {/* Icon Animation */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-brand-red blur-2xl opacity-20 animate-pulse"></div>
          <Cpu size={64} className="text-brand-red animate-bounce" />
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-900 border border-gray-800">
          <div 
            className="h-full bg-brand-red transition-all duration-500 ease-out"
            style={{ width: `${((logIndex + 1) / logs.length) * 100}%` }}
          ></div>
        </div>

        {/* Terminal Output */}
        <div className="bg-gray-900/50 border border-gray-800 p-4 font-mono text-xs h-48 overflow-hidden flex flex-col justify-end">
            {logs.slice(0, logIndex + 1).map((log, i) => (
                <div key={i} className={`mb-1 flex items-center gap-2 ${i === logIndex ? 'text-brand-yellow animate-pulse' : 'text-gray-500'}`}>
                    <span className="opacity-50">{`>`}</span> {log}
                </div>
            ))}
            <div className="text-brand-red animate-pulse mt-2">_PROCESSING</div>
        </div>

        <div className="text-center text-gray-600 text-xs uppercase tracking-widest">
            Do not close this window
        </div>

      </div>
    </div>
  );
};
