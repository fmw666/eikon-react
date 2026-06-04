// Internal to the shell Toolbar — not part of the feature index barrel.

import { useState } from 'react';

import { ReloadIcon } from './icons';

/**
 * Reload control. Clicking spins the glyph one turn (`eikon-tb-reload-
 * spin`) so the "I forced a rebuild" gesture has a tactile confirmation
 * beat. `labelled` shows the "Reload" text (desktop strip); the compact
 * toolbar uses the icon-only square form.
 */
export function ReloadButton({
  onReload,
  labelled = false,
}: {
  onReload: () => void;
  labelled?: boolean;
}) {
  const [spinning, setSpinning] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setSpinning(true);
        onReload();
      }}
      title="Reload preview"
      aria-label="Reload preview"
      className={'eikon-tb-btn' + (labelled ? '' : ' eikon-tb-icon-btn')}
    >
      <span
        className="eikon-tb-reload-glyph"
        data-spinning={spinning ? 'true' : undefined}
        onAnimationEnd={() => setSpinning(false)}
      >
        <ReloadIcon />
      </span>
      {labelled && <span>Reload</span>}
    </button>
  );
}
