import { useEffect, useRef } from 'react';
import { useAgentStore } from '../store/agentStore';
import type { ToolCallRecord, ApprovalRequest, Message } from '../types';
import { projectApi } from '../api/client';

const WS_URL = `ws://${window.location.hostname}:3001/ws`;
const RECONNECT_DELAY_MS = 2000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  // Start false so the StrictMode first-mount cleanup doesn't trigger a reconnect
  const shouldReconnect = useRef(false);
  const store = useAgentStore();

  const connect = () => {
    // Block if already open or mid-handshake
    const readyState = wsRef.current?.readyState;
    if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) return;

    // Mark intent to reconnect BEFORE creating socket
    shouldReconnect.current = true;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      store.setConnected(true);
      console.log('[WS] Connected');
    };

    ws.onclose = () => {
      store.setConnected(false);
      if (!shouldReconnect.current) return; // deliberate close — don't loop
      console.log('[WS] Disconnected — reconnecting...');
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = (e) => {
      console.error('[WS] Error Event', e);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; payload: unknown };
        handleMessage(msg.type, msg.payload);
      } catch {
        // ignore malformed frames
      }
    };
  };

  useEffect(() => {
    connect();
    return () => {
      shouldReconnect.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ws: wsRef.current };
}

// ---------------------------------------------------------------------------
// Message handler — uses getState() so it works outside React render cycle
// ---------------------------------------------------------------------------
function handleMessage(type: string, payload: unknown) {
  const store = useAgentStore.getState();
  const p = payload as Record<string, unknown>;

  switch (type) {
    case 'task:start':
      store.clearToolCalls();
      store.setActiveTaskId(p.taskId as string);
      store.upsertTask({
        id: p.taskId as string,
        prompt: p.prompt as string,
        status: 'running',
        createdAt: Date.now(),
        toolCalls: [],
      });
      break;

    case 'agent:token':
      store.appendToken(p.taskId as string, p.token as string);
      break;

    case 'agent:done': {
      const taskId = p.taskId as string;
      const content = (p.content as string) ?? '';

      // Find existing streaming message for this task and finalise it,
      // or create a new one if no tokens were streamed (e.g. tool-only response)
      const messages = store.messages;
      const idx = [...messages].reverse().findIndex(
        (m) => m.taskId === taskId && m.role === 'assistant',
      );

      if (idx === -1) {
        // No streaming bubble exists yet — create the final message directly
        const finalMsg: Message = {
          id: `${taskId}-done`,
          role: 'assistant',
          content,
          timestamp: Date.now(),
          taskId,
          isStreaming: false,
        };
        store.addMessage(finalMsg);
      } else {
        // Patch the existing streaming bubble: set final content + stop spinner
        const realIdx = messages.length - 1 - idx;
        const updated = [...messages];
        updated[realIdx] = {
          ...updated[realIdx],
          content: content || updated[realIdx].content,
          isStreaming: false,
        };
        useAgentStore.setState({ messages: updated });
      }

      store.upsertTask({
        id: taskId,
        status: 'done',
        result: content,
        finishedAt: Date.now(),
        toolCalls: (p.toolCalls as ToolCallRecord[]) ?? [],
      });
      store.setActiveTaskId(null);
      break;
    }

    case 'agent:error': {
      const taskId = p.taskId as string;
      const errorText = p.error as string;
      const errMsg: Message = {
        id: `${taskId}-error`,
        role: 'system',
        content: `❌ Agent error: ${errorText}`,
        timestamp: Date.now(),
        taskId,
        isStreaming: false,
      };
      store.addMessage(errMsg);
      store.upsertTask({
        id: taskId,
        status: 'error',
        error: errorText,
        finishedAt: Date.now(),
        toolCalls: [],
      });
      store.setActiveTaskId(null);
      break;
    }

    case 'tool:start':
    case 'tool:running':
    case 'tool:success':
    case 'tool:error':
    case 'tool:rejected':
    case 'tool:awaitingApproval':
      store.upsertToolCall(p.toolCall as ToolCallRecord);
      // Push terminal output for runCommand tool
      if (type === 'tool:success' && (p.toolCall as ToolCallRecord).name === 'runCommand') {
        const out = (p.toolCall as ToolCallRecord).output as Record<string, string>;
        if (out?.stdout) store.addTerminalLine(out.stdout);
        if (out?.stderr) store.addTerminalLine(`[stderr] ${out.stderr}`);
      }
      break;

    case 'approval:request':
      store.setPendingApproval(payload as unknown as ApprovalRequest);
      break;

    case 'approval:resolved':
      store.setPendingApproval(null);
      break;

    case 'indexer:done':
    case 'indexer:fileAdded':
    case 'indexer:fileChanged':
    case 'indexer:fileRemoved':
      console.log(`[Indexer] Event ${type}:`, p);
      void projectApi.getFiles().then(({ data }) => {
        store.setProjectFiles(data.files);
      });
      break;

    default:
      break;
  }
}
