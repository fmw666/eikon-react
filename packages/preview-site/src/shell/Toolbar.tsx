import { useUiStore } from './store';

/**
 * Slim toolbar that sits between the params header and the resizable body.
 * Houses the two side-panel toggles plus a status line for whichever file
 * is currently open in the code view (mirrors a real IDE's "tab strip").
 */
export function Toolbar() {
  const showFiles = useUiStore((s) => s.showFiles);
  const toggleFiles = useUiStore((s) => s.toggleFiles);
  const selectedFile = useUiStore((s) => s.selectedFile);

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
      {selectedFile && (
        <span
          style={{
            color: '#9ca3af',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 11,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '40%',
          }}
          title={selectedFile}
        >
          {selectedFile}
        </span>
      )}
    </div>
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
