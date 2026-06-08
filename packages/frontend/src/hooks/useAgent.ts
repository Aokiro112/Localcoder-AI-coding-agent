import { useCallback } from 'react';
import { randomUUID } from '../utils/uuid';
import { agentApi } from '../api/client';
import { useAgentStore } from '../store/agentStore';
import type { Message } from '../types';

export function useAgent() {
  const activeTaskId = useAgentStore((s) => s.activeTaskId);

  const sendMessage = useCallback(
    async (prompt: string) => {
      const state = useAgentStore.getState();
      
      // Add user message
      const userMsg: Message = {
        id: randomUUID(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      };
      state.addMessage(userMsg);

      try {
        const { data } = await agentApi.sendTask(prompt, state.workspacePath || undefined);
        // Task is now running; updates come via WebSocket
        state.setActiveTaskId(data.taskId);
      } catch (err) {
        const errMsg: Message = {
          id: randomUUID(),
          role: 'system',
          content: `Error starting task: ${String(err)}`,
          timestamp: Date.now(),
        };
        state.addMessage(errMsg);
      }
    },
    [],
  );

  return { sendMessage, isRunning: !!activeTaskId };
}
