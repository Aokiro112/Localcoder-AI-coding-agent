import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  HardDrive,
  ChevronRight,
  ChevronLeft,
  Home,
  X,
  Check,
  Loader2,
  FolderInput,
} from 'lucide-react';
import axios from 'axios';

interface BrowseEntry {
  name: string;
  path: string;
  type: 'directory' | 'drive';
}

interface BrowseResult {
  path: string;
  parent: string | null;
  entries: BrowseEntry[];
  isRoot: boolean;
}

interface Props {
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function FolderPickerModal({ onSelect, onClose }: Props) {
  const [current, setCurrent] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [manualPath, setManualPath] = useState('');
  const [error, setError] = useState('');

  const navigate = useCallback(async (path: string | null) => {
    setLoading(true);
    setError('');
    try {
      const url = path
        ? `/api/browse?path=${encodeURIComponent(path)}`
        : '/api/browse';
      const { data } = await axios.get<BrowseResult>(url);
      setCurrent(data);
      setSelected(data.path ?? '');
      setManualPath(data.path ?? '');
    } catch (err) {
      setError('Cannot open this folder');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load drives on mount
  useEffect(() => {
    void navigate(null);
  }, [navigate]);

  // Navigate to home folder
  const goHome = async () => {
    const { data } = await axios.get<{ home: string }>('/api/browse/home');
    await navigate(data.home);
  };

  // Go back
  const goBack = () => {
    if (current?.parent) void navigate(current.parent);
    else void navigate(null);
  };

  // Manual path submit
  const handleManualSubmit = async () => {
    if (!manualPath.trim()) return;
    await navigate(manualPath.trim());
  };

  const handleSelect = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FolderInput size={18} className="text-accent-400" />
            <span className="font-semibold text-white">Open Project Folder</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Manual path bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border-b border-white/5">
          <button
            onClick={goBack}
            disabled={!current?.parent && !current?.isRoot === false}
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
            title="Go back"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => void navigate(null)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
            title="My Computer (Drives)"
          >
            <HardDrive size={15} />
          </button>
          <button
            onClick={() => void goHome()}
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
            title="Home folder"
          >
            <Home size={15} />
          </button>
          <input
            type="text"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleManualSubmit();
            }}
            placeholder="Paste a path here and press Enter…"
            className="flex-1 bg-transparent text-xs font-mono text-slate-300 placeholder-slate-600 outline-none"
          />
          {loading && <Loader2 size={14} className="text-accent-400 animate-spin flex-shrink-0" />}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '320px' }}>
          {error && (
            <div className="px-5 py-3 text-xs text-danger bg-danger/10 border-b border-danger/20">
              {error}
            </div>
          )}

          {!current && !loading && (
            <div className="text-center py-10 text-slate-600 text-sm">Loading drives…</div>
          )}

          {current && (
            <div className="p-2">
              {/* Go up entry */}
              {(current.parent || current.isRoot === false) && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
                >
                  <ChevronLeft size={14} className="flex-shrink-0" />
                  <span className="font-mono text-xs">..</span>
                </button>
              )}

              {current.entries.length === 0 && (
                <div className="text-center py-8 text-slate-600 text-xs">
                  This folder is empty or has no sub-folders.
                </div>
              )}

              {current.entries.map((entry) => {
                const isSelected = selected === entry.path;
                return (
                  <button
                    key={entry.path}
                    onClick={() => {
                      setSelected(entry.path);
                      setManualPath(entry.path);
                    }}
                    onDoubleClick={() => void navigate(entry.path)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-100 text-left ${
                      isSelected
                        ? 'bg-accent-500/15 border border-accent-500/30 text-white'
                        : 'hover:bg-white/5 border border-transparent text-slate-300'
                    }`}
                  >
                    {entry.type === 'drive' ? (
                      <HardDrive
                        size={16}
                        className={`flex-shrink-0 ${isSelected ? 'text-accent-400' : 'text-slate-400'}`}
                      />
                    ) : (
                      <FolderOpen
                        size={16}
                        className={`flex-shrink-0 ${isSelected ? 'text-accent-400' : 'text-yellow-600/70'}`}
                      />
                    )}
                    <span className="text-sm font-medium truncate">{entry.name}</span>
                    <ChevronRight size={13} className="ml-auto text-slate-700 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected path display */}
        <div className="px-4 py-3 bg-black/30 border-t border-white/5">
          <p className="text-xs text-slate-500 mb-1">Selected folder</p>
          <p className="text-xs font-mono text-slate-300 truncate">
            {selected || <span className="text-slate-600">No folder selected</span>}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-folder"
            onClick={handleSelect}
            disabled={!selected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white text-sm font-medium transition-all disabled:opacity-30"
          >
            <Check size={15} />
            Open Project
          </button>
        </div>
      </div>
    </div>
  );
}
