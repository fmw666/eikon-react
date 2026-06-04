import { type ParamsStore } from '@/lib/params-store';

import { type FileNode, type FilesTreeResponse, type SimInputs } from './types';

export function selectSimInputs(s: ParamsStore): SimInputs {
  return {
    platform: String(s.state.platform),
    supabase: !!s.state.supabase,
    pm: String(s.state.pm),
    design: String(s.state.design),
    ui: String(s.state.ui),
    layout: String(s.state.layout),
    toastPosition: String(s.state.toastPosition),
  };
}

export function buildSimQuery(inputs: SimInputs): string {
  const params = new URLSearchParams();
  params.set('platform', inputs.platform);
  params.set('supabase', String(inputs.supabase));
  params.set('pm', inputs.pm);
  params.set('design', inputs.design);
  params.set('ui', inputs.ui);
  params.set('layout', inputs.layout);
  params.set('toastPosition', inputs.toastPosition);
  return params.toString();
}

export function fetchTree(
  inputs: SimInputs,
  signal: AbortSignal
): Promise<FilesTreeResponse> {
  return fetch(`/api/files-tree?${buildSimQuery(inputs)}`, { signal }).then(
    (r) => {
      if (!r.ok) throw new Error(`/api/files-tree failed: ${r.status}`);
      return r.json() as Promise<FilesTreeResponse>;
    }
  );
}

/**
 * Path-traversal of the tree: returns an array of *folder* ids leading to
 * `targetId`. Used to auto-expand to the currently-open file when the tree
 * (re-)loads after a variant switch.
 */
export function ancestorsOf(tree: FileNode[], targetId: string): string[] {
  const out: string[] = [];
  function walk(nodes: FileNode[], trail: string[]): boolean {
    for (const n of nodes) {
      if (n.id === targetId) {
        out.push(...trail);
        return true;
      }
      if (n.children && walk(n.children, [...trail, n.id])) return true;
    }
    return false;
  }
  walk(tree, []);
  return out;
}
