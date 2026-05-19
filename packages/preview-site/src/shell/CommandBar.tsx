import { useState } from 'react';

import { buildAgentInstructions, buildCliCommand } from '@/lib/cli-command';

import { useShellStore } from './store';

export function CommandBar() {
  const state = useShellStore((s) => s.state);
  const [copied, setCopied] = useState(false);

  const command = buildCliCommand(state);
  const clipboardText = buildAgentInstructions(command);

  async function copy() {
    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: 8,
      }}
    >
      <pre
        aria-label="cli-command"
        style={{
          flex: 1,
          minWidth: 200,
          margin: 0,
          padding: '8px 10px',
          background: '#f4f4f4',
          color: '#111',
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: 12,
          lineHeight: 1.5,
          borderRadius: 4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 240,
          overflowY: 'auto',
        }}
      >
        {clipboardText}
      </pre>

      <button type="button" onClick={copy} style={{ flexShrink: 0 }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
