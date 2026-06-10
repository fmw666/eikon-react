/**
 * @file ChangedFileRow.tsx
 * @description The react-arborist row renderer for
 * {@link ./ChangedFilesTree} — indent guides, file/folder icon, name,
 * a tiny GitHub-style +adds/−dels stat cluster and a status badge.
 */

import { Icon } from '@iconify/react';
import { memo, useState } from 'react';
import { type NodeRendererProps } from 'react-arborist';

import { getFileIcon, getFolderIcon } from '@/shell/fileIcons';

import type { FileChangeStatus } from '@/lib/github';

import {
  COLOR_ADD,
  COLOR_BG_HOVER,
  COLOR_BG_SELECTED,
  COLOR_DEL,
  COLOR_GUIDE,
  COLOR_TEXT,
  COLOR_TEXT_MUTED,
  INDENT,
  STATUS_COLOR,
  STATUS_LETTER,
  type TreeNode,
} from './changed-files-tree.shared';

function StatusBadge({ status }: { status: FileChangeStatus }) {
  return (
    <span
      title={status}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 14,
        height: 14,
        padding: '0 3px',
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        color: STATUS_COLOR[status],
        background: `${STATUS_COLOR[status]}20`,
        border: `1px solid ${STATUS_COLOR[status]}40`,
        flexShrink: 0,
        lineHeight: '12px',
      }}
    >
      {STATUS_LETTER[status]}
    </span>
  );
}

export const Row = memo(function Row({
  node,
  style,
  dragHandle,
}: NodeRendererProps<TreeNode>) {
  const [hover, setHover] = useState(false);
  const isFolder = node.data.type === 'dir';
  const iconName = isFolder
    ? getFolderIcon(node.data.name, node.isOpen)
    : getFileIcon(node.data.name);

  const bg = node.isSelected
    ? COLOR_BG_SELECTED
    : hover
      ? COLOR_BG_HOVER
      : 'transparent';

  const additions = node.data.additions;
  const deletions = node.data.deletions;

  return (
    <div
      ref={dragHandle}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 4,
        paddingRight: 6,
        cursor: 'pointer',
        userSelect: 'none',
        background: bg,
        color: COLOR_TEXT,
        fontSize: 13,
        fontFamily:
          '"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        position: 'relative',
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={() => {
        if (isFolder) {
          node.toggle();
        } else {
          node.select();
          node.activate();
        }
      }}
      title={node.id}
    >
      {Array.from({ length: node.level }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: 4 + i * INDENT + INDENT / 2 - 0.5,
            top: 0,
            bottom: 0,
            width: 1,
            background: COLOR_GUIDE,
            pointerEvents: 'none',
          }}
        />
      ))}

      <span
        style={{
          width: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: node.level * INDENT,
        }}
      >
        {isFolder ? <Chevron open={node.isOpen} /> : null}
      </span>

      <Icon
        icon={iconName}
        width={16}
        height={16}
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />

      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {node.data.name}
      </span>

      {/* Right-aligned cluster: additions, deletions, status badge. We
          paint additions GREEN and deletions RED so the row reads as a
          tiny GitHub diff stat at a glance. Folders show roll-up
          counts but no badge (the status is per-file). */}
      {(additions > 0 || deletions > 0) && (
        <span
          style={{
            display: 'inline-flex',
            gap: 4,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 10,
            flexShrink: 0,
          }}
        >
          {additions > 0 && (
            <span style={{ color: COLOR_ADD }}>+{additions}</span>
          )}
          {deletions > 0 && (
            <span style={{ color: COLOR_DEL }}>−{deletions}</span>
          )}
        </span>
      )}

      {!isFolder && node.data.meta && (
        <StatusBadge status={node.data.meta.status} />
      )}
    </div>
  );
});

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      style={{
        flexShrink: 0,
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 80ms ease',
        color: COLOR_TEXT_MUTED,
      }}
      aria-hidden="true"
    >
      <path
        d="M3 1.5 L7 5 L3 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
