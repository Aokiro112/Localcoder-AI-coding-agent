import { Router } from 'express';
import fs from 'fs-extra';
import { projectIndexer } from '../indexer/ProjectIndexer';
import { MemoryStore } from '../memory/MemoryStore';
import { setWorkspace, getWorkspace } from './agentRoutes';

const memory = new MemoryStore();
export const projectRouter = Router();

// POST /api/project/open
projectRouter.post('/open', async (req, res) => {
  const { path: workspacePath } = req.body as { path: string };

  if (!workspacePath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }

  const exists = await fs.pathExists(workspacePath);
  if (!exists) {
    res.status(400).json({ error: `Directory does not exist: ${workspacePath}` });
    return;
  }

  setWorkspace(workspacePath);

  // Start indexing in background
  void projectIndexer.indexProject(workspacePath).then((result) => {
    console.log(`[Indexer] Indexed ${result.indexed} files (${result.errors} errors)`);
  });

  res.json({ path: workspacePath, status: 'indexing' });
});

// GET /api/project/status
projectRouter.get('/status', (_req, res) => {
  const ws = getWorkspace();
  const count = ws ? projectIndexer.getStore().count() : 0;
  res.json({ workspacePath: ws, indexedFiles: count, ready: !!ws });
});

// GET /api/project/files
projectRouter.get('/files', (_req, res) => {
  const files = projectIndexer.getStore().getAllFiles();
  res.json({ files });
});

// GET /api/project/memory
projectRouter.get('/memory', (_req, res) => {
  res.json({ memory: memory.getAll() });
});

// POST /api/project/memory
projectRouter.post('/memory', (req, res) => {
  const { key, value } = req.body as { key: string; value: string };
  if (!key || value === undefined) {
    res.status(400).json({ error: 'key and value are required' });
    return;
  }
  memory.set(key, value);
  res.json({ key, value, saved: true });
});

// DELETE /api/project/memory/:key
projectRouter.delete('/memory/:key', (req, res) => {
  memory.delete(req.params.key);
  res.json({ deleted: true });
});
