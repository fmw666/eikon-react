/**
 * @file DialogShowcasePage.tsx
 * @description Route-level component for `/examples/dialog`.
 *
 * Three Dialog flavours side by side: a basic informational dialog, a
 * form-style dialog with a text input, and a destructive-confirmation
 * dialog with a primary/destructive action pair.
 *
 * Each dialog uses uncontrolled open state (the `defaultOpen` / Trigger
 * pattern Radix provides) so the demo doesn't need its own React state
 * just to toggle visibility.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Third-party Libraries ---
import { Trash2 } from 'lucide-react';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toaster';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';

// =================================================================================================
// Component
// =================================================================================================

function DialogShowcasePage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader
        showBack
        title={t('pages.dialog.title')}
        subtitle={t('pages.dialog.description')}
      />

      <section className="flex flex-wrap gap-3">
          {/* Plain informational dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button>{t('pages.dialog.openLabel')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pages.dialog.title')}</DialogTitle>
                <DialogDescription>
                  {t('pages.dialog.description')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t('pages.dialog.cancel')}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Form-style dialog with an actual input */}
          <FormDialog
            label={t('pages.dialog.openWithFormLabel')}
            t={t}
          />

          {/* Destructive confirmation */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                {t('pages.dialog.openDestructiveLabel')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pages.dialog.openDestructiveLabel')}</DialogTitle>
                <DialogDescription>
                  {t('pages.dialog.destructiveLead')}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t('pages.dialog.destructiveDetail')}
              </p>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t('pages.dialog.cancel')}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      toast.success(t('pages.dialog.destructiveDoneToast'))
                    }
                  >
                    {t('pages.dialog.destructiveConfirm')}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </section>
    </div>
  );
}

// =================================================================================================
// Form dialog (extracted because it owns local state)
// =================================================================================================

interface FormDialogProps {
  label: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function FormDialog({ label, t }: FormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState('');

  const handleSave = () => {
    toast.success(t('pages.dialog.savedToast'));
    setNote('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pages.dialog.formTitle')}</DialogTitle>
          <DialogDescription>{t('pages.dialog.formDescription')}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t('pages.dialog.noteLabel')}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('pages.dialog.notePlaceholder')}
            rows={4}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          />
        </label>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('pages.dialog.cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={note.trim().length === 0}>
            {t('pages.dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { DialogShowcasePage };
