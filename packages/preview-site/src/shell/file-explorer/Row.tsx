import { Icon } from '@iconify/react';
import { memo, useState } from 'react';
import { type NodeRendererProps } from 'react-arborist';

import { getFileIcon, getFolderIcon } from '../fileIcons';
import {
  COLOR_BG_HOVER,
  COLOR_BG_SELECTED,
  COLOR_GUIDE,
  COLOR_TEXT,
  COLOR_TEXT_MUTED,
  INDENT,
} from './tokens';
import { type FileNode } from './types';

function Chevron({ open }: { open: boolean }) {
  // Tiny inline SVG so the chevron is crisp on HiDPI and zero-deps. We rotate
  // the same path 90° instead of drawing a second one.
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

/**
 * Row is wrapped in `memo` because react-arborist re-renders the whole
 * row list on every tree-level state change (selection move, expand,
 * resize). Without memo, scrolling a moderately-sized tree (~200 nodes)
 * re-allocates ~200 indent-guide spans + ~200 SVG sub-trees per frame.
 */
export const Row = memo(function Row({
  node,
  style,
  dragHandle,
}: NodeRendererProps<FileNode>) {
  const [hover, setHover] = useState(false);
  const isFolder = node.data.type === 'dir';
  const iconName = isFolder
    ? getFolderIcon(node.data.name, node.isOpen)
    : getFileIcon(node.data.name);

  // react-arborist places each row absolutely via `style.top`; we ADD our
  // own left padding for the row affordance (chevron / icon) but keep the
  // absolute positioning intact.
  const bg = node.isSelected
    ? COLOR_BG_SELECTED
    : hover
      ? COLOR_BG_HOVER
      : 'transparent';

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
      {/* Indent guides: a thin vertical line per ancestor level. */}
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

      {/* Chevron slot — folders get a real chevron, files get an empty
          spacer of identical width so the icon column stays aligned. */}
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
        }}
      >
        {node.data.name}
      </span>
    </div>
  );
});
