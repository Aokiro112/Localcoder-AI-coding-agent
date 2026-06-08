import axios from 'axios';
import type { IndexedFile, ProjectMemory, Task } from '../types';

const api = axios.create({ baseURL: '/api' });

export const agentApi = {
  sendTask: (prompt: string, workspacePath?: string) =>
    api.post<{ taskId: string; status: string }>('/agent/task', { prompt, workspacePath }),

  getTasks: () =>
    api.get<{ tasks: Task[] }>('/agent/tasks'),

  getTask: (id: string) =>
    api.get<{ task: Task }>(`/agent/tasks/${id}`),

  getTools: () =>
    api.get<{ tools: { name: string; description: string }[] }>('/agent/tools'),
};

export const projectApi = {
  openProject: (path: string) =>
    api.post<{ path: string; status: string }>('/project/open', { path }),

  getStatus: () =>
    api.get<{ workspacePath: string; indexedFiles: number; ready: boolean }>('/project/status'),

  getFiles: () =>
    api.get<{ files: IndexedFile[] }>('/project/files'),

  getMemory: () =>
    api.get<{ memory: ProjectMemory }>('/project/memory'),

  setMemory: (key: string, value: string) =>
    api.post<{ key: string; value: string; saved: boolean }>('/project/memory', { key, value }),

  deleteMemory: (key: string) =>
    api.delete(`/project/memory/${key}`),
};

export const approvalApi = {
  approve: (id: string) =>
    api.post(`/approval/${id}/approve`),

  reject: (id: string) =>
    api.post(`/approval/${id}/reject`),
};

export const healthApi = {
  check: () =>
    api.get<{ status: string; ollama: { ok: boolean; model?: string; error?: string } }>('/health'),
};
