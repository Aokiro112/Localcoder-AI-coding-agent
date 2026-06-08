import { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';

export function TerminalOutput() {
  const { terminalLines, clearTerminal } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 h-14 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Terminal Output</span>
          <span className="text-xs text-slate-600">({terminalLines.length} lines)</span>
        </div>
        <button
          onClick={clearTerminal}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Clear terminal"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black/40 p-4 font-mono text-xs">
        {terminalLines.length === 0 ? (
          <div className="text-slate-600 text-center py-12">
            Terminal output from runCommand tool will appear here.
          </div>
        ) : (
          terminalLines.map((line, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                line.startsWith('[stderr]')
                  ? 'text-danger/80'
                  : line.startsWith('[error]')
                  ? 'text-danger'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
