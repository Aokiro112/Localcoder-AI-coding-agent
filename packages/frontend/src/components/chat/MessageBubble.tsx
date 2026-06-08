import React from 'react';
import { Bot, User } from 'lucide-react';
import type { Message } from '../../types';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center animate-fade-in">
        <span className="text-xs text-slate-500 bg-white/5 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser
            ? 'bg-accent-500/20 text-accent-400'
            : 'bg-white/8 text-slate-300'
        }`}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent-500/15 text-white rounded-tr-sm border border-accent-500/20'
            : 'bg-white/5 text-slate-200 rounded-tl-sm border border-white/5'
        }`}
      >
        {message.isStreaming ? (
          <StreamingContent content={message.content} />
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
}

function StreamingContent({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap font-sans">
      {content}
      <span className="inline-block w-1.5 h-3.5 bg-accent-400 ml-0.5 animate-pulse rounded-sm align-middle" />
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown rendering — code blocks, bold, inline code
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre key={i} className="my-2 rounded-lg bg-black/40 border border-white/10 overflow-x-auto">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
              <span className="text-xs text-slate-500 font-mono">{codeLang || 'code'}</span>
            </div>
            <code className="block p-3 text-xs font-mono text-slate-200 leading-relaxed">
              {codeLines.join('\n')}
            </code>
          </pre>,
        );
      }
    } else if (inCodeBlock) {
      codeLines.push(line);
    } else {
      elements.push(
        <p key={i} className="mb-1 whitespace-pre-wrap">
          {renderInline(line)}
        </p>,
      );
    }
  });

  return <div className="font-sans">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Bold **text** and inline `code`
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-black/40 text-accent-400 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
