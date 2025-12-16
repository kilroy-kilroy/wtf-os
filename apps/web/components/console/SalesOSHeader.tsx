import React from 'react';

interface SalesOSHeaderProps {
  version?: string;
  systemStatus?: 'READY' | 'PROCESSING' | 'ERROR';
  productName?: string;
}

export function SalesOSHeader({
  version = 'v1.0',
  systemStatus = 'READY',
  productName = 'CALL LAB'
}: SalesOSHeaderProps) {
  const statusColors = {
    READY: 'bg-green-500',
    PROCESSING: 'bg-yellow-500',
    ERROR: 'bg-red-500'
  };

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <div className="font-anton text-3xl md:text-4xl uppercase tracking-wide">
          <span className="text-white">SALES</span>
          <span className="text-[#E51B23]">OS</span>
        </div>
        <div className="font-anton text-sm text-[#FFDE59] uppercase tracking-wide mt-1">
          {productName} {version}
        </div>
      </div>
      <div className="flex items-center gap-2 bg-black border border-[#333333] px-3 py-2 rounded">
        <div className={`w-2 h-2 rounded-full ${statusColors[systemStatus]} animate-pulse`}></div>
        <span className="font-anton text-xs text-white uppercase">SYS_{systemStatus}</span>
      </div>
    </div>
  );
}
