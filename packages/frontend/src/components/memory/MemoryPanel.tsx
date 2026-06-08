import { useState } from 'react';
import { Brain, Trash2, Save } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { projectApi } from '../../api/client';
import { useProject } from '../../hooks/useProject';

export function MemoryPanel() {
  const { projectMemory } = useAgentStore();
  const { refreshMemory } = useProject();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      await projectApi.setMemory(newKey.trim(), newValue.trim());
      setNewKey('');
      setNewValue('');
      await refreshMemory();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    await projectApi.deleteMemory(key);
    await refreshMemory();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 h-14 flex-shrink-0">
        <Brain size={14} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Project Memory</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.keys(projectMemory).length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            No memory stored. Add context below.
          </div>
        ) : (
          Object.entries(projectMemory).map(([key, value]) => (
            <div
              key={key}
              className="bg-white/3 border border-white/5 rounded-xl p-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-accent-400 mb-1">{key}</p>
                  <p className="text-sm text-slate-300 break-words">{value}</p>
                </div>
                <button
                  onClick={() => void handleDelete(key)}
                  className="p-1 rounded-lg text-slate-600 hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <p className="text-xs text-slate-500 font-medium">Add Memory</p>
        <input
          id="memory-key"
          type="text"
          placeholder="Key (e.g. projectName)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-accent-500/50 transition-colors"
        />
        <textarea
          id="memory-value"
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-accent-500/50 resize-none transition-colors"
        />
        <button
          id="btn-save-memory"
          onClick={() => void handleSave()}
          disabled={!newKey.trim() || !newValue.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 text-sm transition-all disabled:opacity-30"
        >
          <Save size={13} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
