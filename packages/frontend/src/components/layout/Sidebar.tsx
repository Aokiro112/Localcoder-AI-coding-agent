import {
  MessageSquare,
  FolderOpen,
  Terminal,
  History,
  Brain,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';

const NAV_ITEMS = [
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'files' as const, icon: FolderOpen, label: 'Explorer' },
  { id: 'terminal' as const, icon: Terminal, label: 'Terminal' },
  { id: 'history' as const, icon: History, label: 'History' },
  { id: 'memory' as const, icon: Brain, label: 'Memory' },
];

export function Sidebar() {
  const {
    activePanel,
    setActivePanel,
    sidebarOpen,
    setSidebarOpen,
    connected,
    activeTaskId,
    workspacePath,
  } = useAgentStore();

  return (
    <aside
      className={`flex flex-col bg-surface-900 border-r border-white/5 transition-all duration-300 ${
        sidebarOpen ? 'w-52' : 'w-14'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5 h-14">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          {/* Status dot */}
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface-900 ${
              connected ? 'bg-success' : 'bg-danger'
            }`}
          />
        </div>
        {sidebarOpen && (
          <span className="font-semibold text-white text-sm tracking-wide truncate">
            LocalCoder
          </span>
        )}
      </div>

      {/* Agent status */}
      {activeTaskId && (
        <div
          className={`mx-2 mt-2 px-2 py-1.5 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center gap-2`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-slow flex-shrink-0" />
          {sidebarOpen && <span className="text-xs text-accent-400 truncate">Agent running…</span>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => setActivePanel(id)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
              activePanel === id
                ? 'bg-accent-500/15 text-accent-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={17} className="flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Active Project footer */}
      {sidebarOpen && workspacePath && (
        <div className="mx-2 mb-2 p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Active Workspace</span>
          <span className="text-xs font-mono text-slate-300 truncate" title={workspacePath}>
            {workspacePath.split(/[/\\]/).pop() || workspacePath}
          </span>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="m-2 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors self-end"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </aside>
  );
}
