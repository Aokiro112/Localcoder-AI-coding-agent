import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import type { ToolCallRecord, ToolCallStatus } from '../../types';

const STATUS_CONFIG: Record<
  ToolCallStatus,
  { icon: React.ReactNode; color: string; label: string }
> = {
  pending: { icon: <Clock size={12} />, color: 'text-slate-400', label: 'Pending' },
  running: { icon: <Loader2 size={12} className="animate-spin" />, color: 'text-accent-400', label: 'Running' },
  success: { icon: <CheckCircle size={12} />, color: 'text-success', label: 'Done' },
  error: { icon: <XCircle size={12} />, color: 'text-danger', label: 'Error' },
  rejected: { icon: <ShieldAlert size={12} />, color: 'text-warning', label: 'Rejected' },
};

export function ToolActivityPanel() {
  const { toolCalls, activeTaskId } = useAgentStore();

  return (
    <div className="flex flex-col h-full bg-surface-900/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 h-14">
        <Activity size={14} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Tool Activity</span>
        {activeTaskId && (
          <span className="ml-auto text-xs bg-accent-500/15 text-accent-400 px-2 py-0.5 rounded-full">
            Live
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {toolCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Activity size={24} className="text-slate-700 mb-2" />
            <p className="text-xs text-slate-600">
              Tool calls will appear here as the agent works.
            </p>
          </div>
        ) : (
          [...toolCalls].reverse().map((call) => (
            <ToolCallCard key={call.id} call={call} />
          ))
        )}
      </div>
    </div>
  );
}

function ToolCallCard({ call }: { call: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[call.status];
  const duration = call.finishedAt
    ? `${((call.finishedAt - call.startedAt) / 1000).toFixed(1)}s`
    : null;

  return (
    <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden transition-all duration-150 hover:border-white/10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className={status.color}>{status.icon}</span>
        <span className="text-xs font-mono font-medium text-slate-200 flex-1 truncate">
          {call.name}
        </span>
        {duration && (
          <span className="text-xs text-slate-600 flex-shrink-0">{duration}</span>
        )}
        {expanded ? (
          <ChevronDown size={12} className="text-slate-600 flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
          {/* Input */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Input</p>
            <pre className="text-xs font-mono text-slate-300 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {call.output !== undefined && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Output</p>
              <pre className="text-xs font-mono text-slate-300 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {typeof call.output === 'string'
                  ? call.output
                  : JSON.stringify(call.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {call.error && (
            <div className="text-xs text-danger bg-danger/10 rounded-lg p-2 font-mono">
              {call.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
