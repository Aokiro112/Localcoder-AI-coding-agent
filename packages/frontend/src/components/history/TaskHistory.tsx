import React from 'react';
import { History, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import type { Task, TaskStatus } from '../../types';

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  running: <Loader2 size={13} className="animate-spin text-accent-400" />,
  done: <CheckCircle size={13} className="text-success" />,
  error: <XCircle size={13} className="text-danger" />,
};

export function TaskHistory() {
  const { tasks } = useAgentStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 h-14 flex-shrink-0">
        <History size={14} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Task History</span>
        <span className="text-xs text-slate-600">({tasks.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <History size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const duration = task.finishedAt
    ? formatDuration(task.finishedAt - task.createdAt)
    : null;

  return (
    <div className="bg-white/3 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{STATUS_ICONS[task.status]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-relaxed line-clamp-2">{task.prompt}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Clock size={10} />
              {new Date(task.createdAt).toLocaleTimeString()}
            </span>
            {duration && (
              <span className="text-xs text-slate-600">took {duration}</span>
            )}
            {task.toolCalls.length > 0 && (
              <span className="text-xs text-slate-600">
                {task.toolCalls.length} tool call{task.toolCalls.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {task.error && (
            <p className="mt-2 text-xs text-danger bg-danger/10 rounded-lg px-2 py-1.5">
              {task.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
