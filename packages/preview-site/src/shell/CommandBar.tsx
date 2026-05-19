import { useState } from 'react';

import { buildCliCommand } from '@/lib/cli-command';

import { useShellStore } from './store';

export function CommandBar() {
  const state = useShellStore((s) => s.state);
  const [projectName, setProjectName] = useState('my-app');
  const [copied, setCopied] = useState(false);

  const command = buildCliCommand(state, { projectName });

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
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
        alignItems: 'center',
        gap: 8,
        padding: 8,
        flexWrap: 'wrap',
      }}
    >
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        Project name:
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ minWidth: 140 }}
        />
      </label>

      <code
        aria-label="cli-command"
        style={{
          flex: 1,
          minWidth: 200,
          padding: '6px 8px',
          background: '#f4f4f4',
          color: '#111',
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: 12,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {command}
      </code>

      <button type="button" onClick={copy}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
