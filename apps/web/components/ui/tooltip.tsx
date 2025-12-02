'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

// Touch-friendly tooltip that works on mobile
const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>(({ children, ...props }, _ref) => {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      delayDuration={100}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === TooltipTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
              // Toggle on touch/click for mobile
              e.preventDefault();
              setOpen(prev => !prev);
              // Call original onClick if it exists
              const originalOnClick = (child as React.ReactElement<any>).props?.onClick;
              if (originalOnClick) originalOnClick(e);
            },
            onTouchStart: (e: React.TouchEvent) => {
              // Prevent default to avoid double-firing
              setOpen(true);
            },
          });
        }
        return child;
      })}
    </TooltipPrimitive.Root>
  );
});
Tooltip.displayName = 'Tooltip';

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-[#1A1A1A] border border-[#E51B23] px-3 py-2 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-w-[300px]',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
