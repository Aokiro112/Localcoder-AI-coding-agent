import { useState } from 'react';
import { FolderOpen, File, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { useProject } from '../../hooks/useProject';
import { FolderPickerModal } from '../project/FolderPickerModal';
import type { IndexedFile } from '../../types';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  file?: IndexedFile;
}

function buildTree(files: IndexedFile[]): TreeNode[] {
  const root: TreeNode = { name: 'root', path: '', type: 'directory', children: [] };

  for (const file of files) {
    const parts = file.path.replace(/\\/g, '/').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children) current.children = [];

      let node = current.children.find((c) => c.name === part);
      if (!node) {
        node = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isLast ? 'file' : 'directory',
          children: isLast ? undefined : [],
          file: isLast ? file : undefined,
        };
        current.children.push(node);
      }
      current = node;
    }
  }

  return root.children ?? [];
}

export function FileExplorer() {
  const { projectFiles, workspacePath } = useAgentStore();
  const { refreshFiles, openProject } = useProject();
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const tree = buildTree(projectFiles);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFiles();
    } finally {
      setRefreshing(false);
    }
  };

  const handleFolderSelected = async (path: string) => {
    await openProject(path);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 h-14 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Explorer</span>
          {projectFiles.length > 0 && (
            <span className="text-xs text-slate-600">({projectFiles.length} files)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!workspacePath ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FolderOpen size={32} className="text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 mb-4">No project open</p>
            <button
              onClick={() => setShowPicker(true)}
              className="px-3 py-1.5 rounded-lg bg-accent-500/15 text-accent-400 text-xs hover:bg-accent-500/25 transition-colors"
            >
              Open Project
            </button>
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-600">
            Indexing project files…
          </div>
        ) : (
          <TreeView nodes={tree} depth={0} />
        )}
      </div>

      {showPicker && (
        <FolderPickerModal
          onSelect={(path) => void handleFolderSelected(path)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function TreeView({ nodes, depth }: { nodes: TreeNode[]; depth: number }) {
  return (
    <>
      {nodes
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((node) => (
          <TreeItem key={node.path} node={node} depth={depth} />
        ))}
    </>
  );
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const isDir = node.type === 'directory';

  return (
    <div>
      <button
        onClick={() => isDir && setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg hover:bg-white/5 text-left group transition-colors"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isDir ? (
          <>
            {open ? (
              <ChevronDown size={12} className="text-slate-600 flex-shrink-0" />
            ) : (
              <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
            )}
            <FolderOpen size={13} className="text-accent-400/70 flex-shrink-0" />
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <File size={13} className="text-slate-500 flex-shrink-0" />
          </>
        )}
        <span className="text-xs text-slate-300 group-hover:text-white truncate transition-colors">
          {node.name}
        </span>
        {node.file && (
          <span className="ml-auto text-xs text-slate-700 flex-shrink-0 pr-1">
            {node.file.language ?? ''}
          </span>
        )}
      </button>

      {isDir && open && node.children && (
        <TreeView nodes={node.children} depth={depth + 1} />
      )}
    </div>
  );
}
