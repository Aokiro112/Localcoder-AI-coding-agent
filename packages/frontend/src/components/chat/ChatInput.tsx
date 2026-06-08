import { useState, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAgent } from '../../hooks/useAgent';

export function ChatInput() {
  const [value, setValue] = useState('');
  const { sendMessage, isRunning } = useAgent();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isRunning) return;
    setValue('');
    await sendMessage(trimmed);
  }, [value, isRunning, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-accent-500/50 transition-colors">
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Agent is working…' : 'Ask LocalCoder anything about your code…'}
          disabled={isRunning}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none leading-relaxed min-h-[20px] max-h-40 overflow-y-auto px-2 py-1 disabled:opacity-50"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
        <button
          id="btn-send"
          onClick={() => void handleSubmit()}
          disabled={!value.trim() || isRunning}
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-30 bg-accent-500 hover:bg-accent-400 text-white"
        >
          {isRunning ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
      <p className="text-center text-xs text-slate-600 mt-2">
        Shift+Enter for new line · Enter to send
      </p>
    </div>
  );
}
