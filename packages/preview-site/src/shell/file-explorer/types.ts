export interface FileNode {
  id: string;
  name: string;
  type: 'dir' | 'file';
  children?: FileNode[];
}

export interface FilesTreeResponse {
  tree: FileNode[];
}

/**
 * The 6-tuple of params the new `/api/files-tree` + `/api/file-content`
 * endpoints accept. Phase F decoupled the file panel from the build
 * cache: a runtime-only axis flip (e.g. design) re-renders the tree from
 * a pure simulator pass instead of waiting for a viteBuild.
 */
export interface SimInputs {
  platform: string;
  supabase: boolean;
  pm: string;
  design: string;
  ui: string;
  layout: string;
  toastPosition: string;
}
