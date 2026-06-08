import { Router } from 'express';
import { randomUUID } from 'crypto';
import { AgentOrchestrator } from '../agent/AgentOrchestrator';
import { ToolRegistry } from '../agent/ToolRegistry';
import { readFileTool } from '../tools/readFile';
import { writeFileTool } from '../tools/writeFile';
import { createFileTool } from '../tools/createFile';
import { deleteFileTool } from '../tools/deleteFile';
import { listDirectoryTool } from '../tools/listDirectory';
import { searchCodeTool } from '../tools/searchCode';
import { runCommandTool } from '../tools/runCommand';
import { gitStatusTool } from '../tools/gitStatus';
import { gitDiffTool } from '../tools/gitDiff';
import { getDb } from '../db/database';

// Shared tool registry and orchestrator
const registry = new ToolRegistry();
[
  readFileTool,
  writeFileTool,
  createFileTool,
  deleteFileTool,
  listDirectoryTool,
  searchCodeTool,
  runCommandTool,
  gitStatusTool,
  gitDiffTool,
].forEach((t) => registry.register(t));

const orchestrator = new AgentOrchestrator(registry);

// Current workspace (set via /api/project/open)
let currentWorkspace = '';

export function setWorkspace(ws: string): void {
  currentWorkspace = ws;
}
export function getWorkspace(): string {
  return currentWorkspace;
}

export const agentRouter = Router();

// POST /api/agent/task
agentRouter.post('/task', (req, res) => {
  const { prompt, workspacePath } = req.body as {
    prompt: string;
    workspacePath?: string;
  };

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const ws = workspacePath ?? currentWorkspace;
  if (!ws) {
    res.status(400).json({ error: 'No workspace open. POST /api/project/open first.' });
    return;
  }

  const taskId = randomUUID();
  const task = { id: taskId, prompt, workspacePath: ws };

  // Run agent in background (non-blocking)
  void orchestrator.runTask(task);

  res.json({ taskId, status: 'running' });
});

// GET /api/agent/tasks
agentRouter.get('/tasks', (_req, res) => {
  const tasks = getDb()
    .prepare('SELECT id, prompt, status, created_at, finished_at FROM tasks ORDER BY created_at DESC LIMIT 50')
    .all();
  res.json({ tasks });
});

// GET /api/agent/tasks/:id
agentRouter.get('/tasks/:id', (req, res) => {
  const task = getDb()
    .prepare('SELECT * FROM tasks WHERE id=?')
    .get(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task });
});

// GET /api/agent/tools
agentRouter.get('/tools', (_req, res) => {
  res.json({ tools: registry.getAllTools().map((t) => ({ name: t.name, description: t.description })) });
});
