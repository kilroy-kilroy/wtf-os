import React from 'react';
import Image from 'next/image';

export interface SalesOSHeaderProps {
  version?: string;
  systemStatus?: 'READY' | 'PROCESSING' | 'ERROR' | 'PRO ACTIVE' | string;
  productName?: string;
  productVariant?: 'LITE' | 'PRO';
}

export function SalesOSHeader({
  version = 'v1.0',
  systemStatus = 'READY',
  productName = 'CALL LAB',
  productVariant
}: SalesOSHeaderProps) {
  const statusColors: Record<string, string> = {
    READY: 'bg-green-500',
    PROCESSING: 'bg-yellow-500',
    ERROR: 'bg-red-500',
    'PRO ACTIVE': 'bg-[#E51B23]'
  };

  const statusColor = statusColors[systemStatus] || 'bg-green-500';

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <Image
          src="/logos/salesosdemandossqtransparent.png"
          alt="SalesOS"
          width={120}
          height={120}
          className="mb-2"
        />
        <div className="font-anton text-sm uppercase tracking-wide mt-1">
          <span className="text-[#FFDE59]">{productName}</span>
          {productVariant && (
            <span className={productVariant === 'PRO' ? 'text-[#E51B23] ml-2' : 'text-[#666] ml-2'}>
              {productVariant}
            </span>
          )}
          <span className="text-[#666] ml-2">{version}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-black border border-[#333333] px-3 py-2 rounded">
        <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></div>
        <span className="font-anton text-xs text-white uppercase">SYS_{systemStatus.replace(' ', '_')}</span>
      </div>
    </div>
  );
}
