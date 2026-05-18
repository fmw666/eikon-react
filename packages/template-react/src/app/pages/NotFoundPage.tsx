import { Link } from 'react-router-dom';

import { Button } from '@/shared/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium text-[var(--color-muted-foreground)]">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
