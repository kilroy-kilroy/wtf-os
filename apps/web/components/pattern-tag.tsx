'use client';

import { getPatternByName, PatternDefinition } from '@/lib/patternGlossary';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PatternTagProps {
  pattern: string;
  className?: string;
}

export function PatternTag({ pattern, className = '' }: PatternTagProps) {
  const patternDef = getPatternByName(pattern);

  const baseClasses = "px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1";
  const typeClasses = patternDef?.type === 'positive'
    ? "bg-[#1A1A1A] border border-green-700 text-green-400"
    : patternDef?.type === 'risk'
    ? "bg-[#1A1A1A] border border-[#E51B23] text-[#E51B23]"
    : patternDef?.type === 'metric'
    ? "bg-[#1A1A1A] border border-[#FFDE59] text-[#FFDE59]"
    : "bg-[#1A1A1A] border border-[#333] text-white";

  if (!patternDef) {
    // No tooltip, just display the pattern name
    return (
      <span className={`${baseClasses} ${typeClasses} ${className}`}>
        {pattern}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`${baseClasses} ${typeClasses} cursor-help ${className}`}
            data-type={patternDef.type}
          >
            {patternDef.type === 'positive' && (
              <span className="text-green-500 text-xs">+</span>
            )}
            {patternDef.type === 'risk' && (
              <span className="text-[#E51B23] text-xs">!</span>
            )}
            {patternDef.type === 'metric' && (
              <span className="text-[#FFDE59] text-xs">◆</span>
            )}
            {pattern}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className={`max-w-[280px] text-sm ${
            patternDef.type === 'positive'
              ? 'border-green-700 bg-black'
              : patternDef.type === 'metric'
              ? 'border-[#FFDE59] bg-black'
              : 'border-[#E51B23] bg-black'
          }`}
        >
          <p className="font-medium mb-1">{patternDef.name}</p>
          <p className="text-[#B3B3B3]">{patternDef.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// For displaying multiple patterns
interface PatternListProps {
  patterns: string[];
  className?: string;
}

export function PatternList({ patterns, className = '' }: PatternListProps) {
  if (!patterns || patterns.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {patterns.map((pattern, i) => (
        <PatternTag key={i} pattern={pattern} />
      ))}
    </div>
  );
}
