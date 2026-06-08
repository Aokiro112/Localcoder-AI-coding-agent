import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { config } from './config';
import { getDb } from './db/database';
import { agentRouter } from './routes/agentRoutes';
import { projectRouter } from './routes/projectRoutes';
import { approvalRouter } from './routes/approvalRoutes';
import { browseRouter } from './routes/browseRoutes';
import { safetyLayer } from './agent/SafetyLayer';
import { OllamaClient } from './agent/OllamaClient';

async function main(): Promise<void> {
  // Init DB
  getDb();
  console.log('[DB] SQLite ready');

  // Check Ollama
  const ollama = new OllamaClient();
  const ollamaStatus = await ollama.checkAvailability();
  if (!ollamaStatus.ok) {
    console.warn(`[Ollama] ⚠ Not reachable: ${ollamaStatus.error}`);
    console.warn('[Ollama] Start Ollama and ensure qwen2.5-coder:14b is pulled.');
  } else if (!ollamaStatus.model) {
    console.warn(`[Ollama] ⚠ Connected but model "${config.ollamaModel}" not found.`);
    console.warn(`[Ollama] Run: ollama pull ${config.ollamaModel}`);
  } else {
    console.log(`[Ollama] ✓ Ready with model ${config.ollamaModel}`);
  }

  // Express
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/agent', agentRouter);
  app.use('/api/project', projectRouter);
  app.use('/api/approval', approvalRouter);
  app.use('/api/browse', browseRouter);

  // Health check
  app.get('/api/health', async (_req, res) => {
    const status = await ollama.checkAvailability();
    res.json({
      status: 'ok',
      ollama: status,
      model: config.ollamaModel,
      port: config.port,
    });
  });

  // HTTP + WebSocket on the same port
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected');
    safetyLayer.addClient(ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; payload?: unknown };
        console.log('[WS] Received:', msg.type);
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    // Send initial state
    ws.send(JSON.stringify({ type: 'connected', payload: { version: '1.0.0' } }));
  });

  server.listen(config.port, () => {
    console.log(`[Server] LocalCoder backend running on http://localhost:${config.port}`);
    console.log(`[Server] WebSocket available at ws://localhost:${config.port}/ws`);
  });
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
