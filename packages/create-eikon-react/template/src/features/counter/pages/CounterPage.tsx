/**
 * @file CounterPage.tsx
 * @description Route-level component for `/counter`.
 *
 * Wires the counter store actions to buttons and toasts. Demonstrates
 * the simpler shape pure-client features use — direct store reads,
 * no service/selector layer.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Third-party Libraries ---
import { Minus, Plus, RotateCcw } from 'lucide-react';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { toast } from '@/shared/ui/toaster';

// --- Relative Imports ---
import { CounterDisplay } from '../components/CounterDisplay';
import { useCounterStore } from '../stores/counterStore';

// =================================================================================================
// Component
// =================================================================================================

function CounterPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string, opts?: { value?: number }) =>
  //   k === 'counter.current'
  //     ? `Current value: ${opts?.value ?? 0}`
  //     : ({
  //         'counter.title': 'Counter demo',
  //         'counter.description':
  //           'Demonstrates a feature-first module with Zustand state and tests.',
  //         'counter.increment': 'Increment',
  //         'counter.decrement': 'Decrement',
  //         'counter.reset': 'Reset',
  //         'counter.toastIncreased': 'Counter increased',
  //         'counter.toastReset': 'Counter reset to zero',
  //       })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  const value = useCounterStore((s) => s.value);
  const increment = useCounterStore((s) => s.increment);
  const decrement = useCounterStore((s) => s.decrement);
  const reset = useCounterStore((s) => s.reset);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('counter.title')}</CardTitle>
        <CardDescription>{t('counter.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <CounterDisplay value={value} />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('counter.current', { value })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => {
              increment();
              toast.success(t('counter.toastIncreased'));
            }}
          >
            <Plus className="h-4 w-4" />
            {t('counter.increment')}
          </Button>
          <Button variant="secondary" onClick={decrement} disabled={value === 0}>
            <Minus className="h-4 w-4" />
            {t('counter.decrement')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              toast(t('counter.toastReset'));
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {t('counter.reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { CounterPage };
