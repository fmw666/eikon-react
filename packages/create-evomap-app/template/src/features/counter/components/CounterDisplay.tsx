import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/shared/lib/cn';

interface CounterDisplayProps {
  value: number;
  className?: string;
}

export function CounterDisplay({ value, className }: CounterDisplayProps) {
  return (
    <div
      className={cn(
        'relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]',
        className
      )}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="text-3xl font-semibold tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
