import { create } from 'zustand';
import type {
  Message,
  Task,
  ToolCallRecord,
  ApprovalRequest,
  IndexedFile,
  ProjectMemory,
} from '../types';

interface AgentState {
  // Connection
  connected: boolean;
  setConnected: (v: boolean) => void;

  // Workspace
  workspacePath: string;
  setWorkspacePath: (path: string) => void;

  // Messages (chat history)
  messages: Message[];
  addMessage: (msg: Message) => void;
  appendToken: (taskId: string, token: string) => void;
  clearMessages: () => void;

  // Active task
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;

  // Tasks history
  tasks: Task[];
  upsertTask: (task: Partial<Task> & { id: string }) => void;

  // Live tool calls for the active task
  toolCalls: ToolCallRecord[];
  upsertToolCall: (call: ToolCallRecord) => void;
  clearToolCalls: () => void;

  // Approval
  pendingApproval: ApprovalRequest | null;
  setPendingApproval: (req: ApprovalRequest | null) => void;

  // File explorer
  projectFiles: IndexedFile[];
  setProjectFiles: (files: IndexedFile[]) => void;

  // Memory
  projectMemory: ProjectMemory;
  setProjectMemory: (mem: ProjectMemory) => void;

  // Terminal output
  terminalLines: string[];
  addTerminalLine: (line: string) => void;
  clearTerminal: () => void;

  // UI state
  activePanel: 'chat' | 'files' | 'terminal' | 'history' | 'memory';
  setActivePanel: (panel: AgentState['activePanel']) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),

  workspacePath: '',
  setWorkspacePath: (path) => set({ workspacePath: path }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendToken: (taskId, token) =>
    set((s) => {
      // Find the last assistant message for this taskId
      let idx = -1;
      for (let i = s.messages.length - 1; i >= 0; i--) {
        if (s.messages[i].taskId === taskId && s.messages[i].role === 'assistant') {
          idx = i;
          break;
        }
      }
      if (idx === -1) {
        const newMsg: Message = {
          id: `${taskId}-stream`,
          role: 'assistant',
          content: token,
          timestamp: Date.now(),
          taskId,
          isStreaming: true,
        };
        return { messages: [...s.messages, newMsg] };
      }
      const updated = [...s.messages];
      updated[idx] = { ...updated[idx], content: updated[idx].content + token };
      return { messages: updated };
    }),
  clearMessages: () => set({ messages: [] }),

  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),

  tasks: [],
  upsertTask: (partial) =>
    set((s) => {
      const idx = s.tasks.findIndex((t) => t.id === partial.id);
      if (idx === -1) {
        return {
          tasks: [
            { toolCalls: [], status: 'running', prompt: '', createdAt: Date.now(), ...partial } as Task,
            ...s.tasks,
          ],
        };
      }
      const updated = [...s.tasks];
      updated[idx] = { ...updated[idx], ...partial };
      return { tasks: updated };
    }),

  toolCalls: [],
  upsertToolCall: (call) =>
    set((s) => {
      const idx = s.toolCalls.findIndex((c) => c.id === call.id);
      if (idx === -1) return { toolCalls: [...s.toolCalls, call] };
      const updated = [...s.toolCalls];
      updated[idx] = { ...updated[idx], ...call };
      return { toolCalls: updated };
    }),
  clearToolCalls: () => set({ toolCalls: [] }),

  pendingApproval: null,
  setPendingApproval: (req) => set({ pendingApproval: req }),

  projectFiles: [],
  setProjectFiles: (files) => set({ projectFiles: files }),

  projectMemory: {},
  setProjectMemory: (mem) => set({ projectMemory: mem }),

  terminalLines: [],
  addTerminalLine: (line) =>
    set((s) => ({ terminalLines: [...s.terminalLines.slice(-500), line] })),
  clearTerminal: () => set({ terminalLines: [] }),

  activePanel: 'chat',
  setActivePanel: (panel) => set({ activePanel: panel }),
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
