'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function InfoTooltip({
  content,
  className,
  iconClassName,
  side = 'top',
  align = 'center',
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-full p-0.5 text-[#666666] hover:text-[#E51B23] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E51B23] focus:ring-offset-2 focus:ring-offset-black',
              className
            )}
          >
            <Info className={cn('h-4 w-4', iconClassName)} />
            <span className="sr-only">More information</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align={align}>
          <p className="font-poppins text-[13px] leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  className?: string;
  labelClassName?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function LabelWithTooltip({
  label,
  tooltip,
  className,
  labelClassName,
  as: Component = 'span',
  side = 'top',
}: LabelWithTooltipProps) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Component className={labelClassName}>{label}</Component>
      <InfoTooltip content={tooltip} side={side} />
    </div>
  );
}
