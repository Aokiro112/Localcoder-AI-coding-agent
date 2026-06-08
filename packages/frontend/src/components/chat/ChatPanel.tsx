import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Wifi, WifiOff } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { useProject } from '../../hooks/useProject';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useAgent } from '../../hooks/useAgent';
import { FolderPickerModal } from '../project/FolderPickerModal';

export function ChatPanel() {
  const { messages, connected, workspacePath } = useAgentStore();
  const { openProject } = useProject();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [openingProject, setOpeningProject] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFolderSelected = async (path: string) => {
    setOpeningProject(true);
    try {
      await openProject(path);
    } finally {
      setOpeningProject(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 h-14 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi size={14} className="text-success" />
            ) : (
              <WifiOff size={14} className="text-danger animate-pulse" />
            )}
            <span className="text-xs text-slate-400">
              {connected ? 'Connected' : 'Connecting…'}
            </span>
          </div>
          {workspacePath && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300 max-w-xs truncate" title={workspacePath}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse"></span>
              <span className="truncate">{workspacePath}</span>
            </div>
          )}
        </div>
        <button
          id="btn-open-project"
          onClick={() => setShowPicker(true)}
          disabled={openingProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all duration-150 disabled:opacity-50"
        >
          <FolderOpen size={13} />
          {openingProject ? 'Opening…' : workspacePath ? 'Change Project' : 'Open Project'}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState onOpenProject={() => setShowPicker(true)} hasWorkspace={!!workspacePath} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput />

      {/* Folder Picker Modal */}
      {showPicker && (
        <FolderPickerModal
          onSelect={(path) => void handleFolderSelected(path)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function EmptyState({
  onOpenProject,
  hasWorkspace,
}: {
  onOpenProject: () => void;
  hasWorkspace: boolean;
}) {
  const starters = [
    'List all files in this project',
    'Find all TODO comments in the code',
    'Explain the architecture of this project',
    'Search for any TypeScript errors',
    'Show the git status',
  ];
  const { sendMessage } = useAgent();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400/20 to-accent-600/10 border border-accent-400/20 flex items-center justify-center mb-4">
        <span className="text-3xl">⚡</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-1">LocalCoder</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-sm">
        Your local AI coding agent powered by Qwen2.5-Coder 14B.{' '}
        {!hasWorkspace && 'Open a project folder to get started.'}
      </p>

      {!hasWorkspace && (
        <button
          onClick={onOpenProject}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-medium transition-all duration-150 mb-8 shadow-lg shadow-accent-500/25"
        >
          <FolderOpen size={15} />
          Browse & Open Project
        </button>
      )}

      {hasWorkspace && (
        <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => void sendMessage(s)}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs transition-all duration-150 border border-white/5 hover:border-white/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
