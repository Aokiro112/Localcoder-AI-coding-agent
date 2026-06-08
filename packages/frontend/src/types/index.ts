// Agent task & tool types
export type TaskStatus = 'running' | 'done' | 'error';
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error' | 'rejected';

export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: ToolCallStatus;
  startedAt: number;
  finishedAt?: number;
}

export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  toolCalls: ToolCallRecord[];
  result?: string;
  error?: string;
  createdAt: number;
  finishedAt?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  taskId?: string;
  isStreaming?: boolean;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  type: 'deleteFile' | 'dangerousCommand' | 'recursiveOperation';
  description: string;
  payload: Record<string, unknown>;
}

export interface IndexedFile {
  path: string;
  language: string | null;
  imports: string[];
  exports: string[];
  size: number;
  lastModified: number;
}

export interface ProjectMemory {
  [key: string]: string;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: { type: 'add' | 'del' | 'normal'; content: string }[];
}

export interface FileDiff {
  filename: string;
  oldContent: string;
  newContent: string;
  unified: string;
  hunks: DiffHunk[];
}
