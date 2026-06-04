import { iconLoaded, loadIcons } from '@iconify/react';
import { useEffect, useState } from 'react';

import { getFileIcon, getFolderIcon } from '../fileIcons';
import { type FileNode } from './types';

/* ------------------------------------------------------------------------- */
/* Icon preloading                                                           */
/* ------------------------------------------------------------------------- */

function allIconsReady(icons: string[]): boolean {
  return icons.every((name) => iconLoaded(name));
}

function collectIconsDeep(nodes: FileNode[]): string[] {
  const icons: string[] = [];
  function walk(list: FileNode[]) {
    for (const n of list) {
      if (n.type === 'dir') {
        icons.push(getFolderIcon(n.name, false));
        icons.push(getFolderIcon(n.name, true));
        if (n.children) walk(n.children);
      } else {
        icons.push(getFileIcon(n.name));
      }
    }
  }
  walk(nodes);
  return [...new Set(icons)];
}

export function useIconsReady(nodes: FileNode[] | null): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      setReady(true);
      return;
    }
    const icons = collectIconsDeep(nodes);
    if (allIconsReady(icons)) {
      setReady(true);
      return;
    }
    setReady(false);
    const unsub = loadIcons(icons, (_loaded, _missing, pending) => {
      if (pending.length === 0) setReady(true);
    });
    return () => { unsub(); };
  }, [nodes]);

  return ready;
}
