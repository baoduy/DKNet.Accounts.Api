import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function TooltipProvider({ delayDuration = 200, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>): JSX.Element {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

export function Tooltip({ ...props }: ComponentProps<typeof TooltipPrimitive.Root>): JSX.Element {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>): JSX.Element {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>): JSX.Element {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
