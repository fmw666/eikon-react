import { useUiStore } from './store';

/**
 * Slim toolbar that sits between the params header and the resizable body.
 * Houses the side-panel toggle plus a "reload preview" action — the file
 * currently open in the editor is already shown in the CodeView header, so
 * we don't duplicate it here.
 */
export function Toolbar() {
  const showFiles = useUiStore((s) => s.showFiles);
  const toggleFiles = useUiStore((s) => s.toggleFiles);
  const reloadPreview = useUiStore((s) => s.reloadPreview);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: '#252526',
        color: '#d4d4d4',
        borderBottom: '1px solid #2d2d30',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
      }}
    >
      {/*
        Only "Files" gets a toolbar toggle — Editor is a child of Files in
        the UX model (you pick a file in the tree, the editor opens). To
        close just the Editor while keeping Files open, use the × on the
        editor's title bar.
      */}
      <ToggleButton
        active={showFiles}
        onClick={toggleFiles}
        label="Files"
        title={`${showFiles ? 'Hide' : 'Show'} file explorer`}
      />
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={reloadPreview}
        title="Reload preview"
        aria-label="Reload preview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          color: '#d4d4d4',
          border: '1px solid #3a3a3a',
          borderRadius: 3,
          padding: '2px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <ReloadIcon />
        <span>Reload</span>
      </button>
    </div>
  );
}

function ReloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? '#0e639c' : 'transparent',
        color: active ? '#fff' : '#d4d4d4',
        border: '1px solid ' + (active ? '#1177bb' : '#3a3a3a'),
        borderRadius: 3,
        padding: '2px 10px',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
