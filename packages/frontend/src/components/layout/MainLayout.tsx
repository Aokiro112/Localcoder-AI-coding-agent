import { useState } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { FileExplorer } from '../explorer/FileExplorer';
import { TerminalOutput } from '../terminal/TerminalOutput';
import { TaskHistory } from '../history/TaskHistory';
import { MemoryPanel } from '../memory/MemoryPanel';
import { ToolActivityPanel } from '../tools/ToolActivityPanel';
import { ApprovalModal } from '../approval/ApprovalModal';
import { useAgentStore } from '../../store/agentStore';
import { useProject } from '../../hooks/useProject';

function readDirectoryEntries(dirEntry: any): Promise<{ name: string; type: 'file' | 'directory' }[]> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader();
    reader.readEntries(
      (entries: any[]) => {
        const result = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory ? ('directory' as const) : ('file' as const),
        }));
        resolve(result);
      },
      (err: any) => reject(err)
    );
  });
}

export function MainLayout() {
  const { activePanel, pendingApproval } = useAgentStore();
  const { openProject } = useProject();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const item = items[0];
    if (item.kind !== 'file') return;

    const entry = item.webkitGetAsEntry();
    if (!entry) return;

    if (entry.isDirectory) {
      setLoading(true);
      const dirEntry = entry;
      const folderName = dirEntry.name;

      try {
        const contents = await readDirectoryEntries(dirEntry);
        const { data } = await axios.post<{ path: string }>('/api/browse/locate-dropped', {
          folderName,
          contents,
        });

        await openProject(data.path);
      } catch (err: any) {
        const errMsg = err.response?.data?.error || err.message;
        alert(`Could not open folder: ${errMsg}`);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please drop a folder, not a file.');
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => void handleDrop(e)}
      className="flex h-screen bg-surface-950 text-white overflow-hidden relative"
    >
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Primary panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activePanel === 'chat' && <ChatPanel />}
          {activePanel === 'files' && <FileExplorer />}
          {activePanel === 'terminal' && <TerminalOutput />}
          {activePanel === 'history' && <TaskHistory />}
          {activePanel === 'memory' && <MemoryPanel />}
        </div>

        {/* Tool activity panel (right side, always visible in chat mode) */}
        {activePanel === 'chat' && (
          <div className="w-80 border-l border-white/5 flex-shrink-0">
            <ToolActivityPanel />
          </div>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-accent-950/70 backdrop-blur-md border-4 border-dashed border-accent-500/50 m-4 rounded-3xl animate-fade-in pointer-events-none">
          <FolderOpen size={64} className="text-accent-400 animate-bounce mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Drop to Open Project</h3>
          <p className="text-accent-200 text-sm">Release the folder to automatically load the workspace</p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <Loader2 size={48} className="text-accent-400 animate-spin mb-4" />
          <h3 className="text-xl font-semibold text-white mb-1">Locating Folder…</h3>
          <p className="text-slate-400 text-sm">Searching your local system for the dropped project folder</p>
        </div>
      )}

      {/* Approval modal overlay */}
      {pendingApproval && <ApprovalModal />}
    </div>
  );
}
