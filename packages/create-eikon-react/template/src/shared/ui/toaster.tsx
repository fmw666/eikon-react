import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-lg',
          title: 'text-sm font-medium',
          description: 'text-xs text-[var(--color-muted-foreground)]',
        },
      }}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { toast };
