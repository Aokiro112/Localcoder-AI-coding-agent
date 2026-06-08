import { EventEmitter } from 'events';
import { type WebSocket } from 'ws';

// Commands that require user approval regardless of context
const DANGEROUS_PATTERNS = [
  /\brm\s+-[rf]/i,
  /\bdel\s+\/[sqs]/i,
  /\bformat\s+[a-z]:/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bpoweroff\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  />\s*\/dev\/[a-z]/i,
  /\bchmod\s+777/i,
  /\bchown\s+-R/i,
  /\bdrop\s+database/i,
  /\btruncate\s+table/i,
  /\bsudo\s+rm/i,
  /\bnpx\s+.*--yes.*rm/i,
];

export interface ApprovalRequest {
  id: string;
  taskId: string;
  type: 'deleteFile' | 'dangerousCommand' | 'recursiveOperation';
  description: string;
  payload: Record<string, unknown>;
}

export class SafetyLayer extends EventEmitter {
  private pendingApprovals = new Map<
    string,
    { resolve: (approved: boolean) => void }
  >();
  private connectedClients = new Set<WebSocket>();

  addClient(ws: WebSocket): void {
    this.connectedClients.add(ws);
    ws.on('close', () => this.connectedClients.delete(ws));
  }

  isDangerousCommand(command: string): boolean {
    return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
  }

  async requestApproval(request: ApprovalRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingApprovals.set(request.id, { resolve });

      // Broadcast to all connected frontend clients
      const message = JSON.stringify({
        type: 'approval:request',
        payload: request,
      });

      for (const ws of this.connectedClients) {
        if (ws.readyState === 1 /* OPEN */) {
          ws.send(message);
        }
      }

      // Auto-reject after 5 minutes if no response
      setTimeout(() => {
        if (this.pendingApprovals.has(request.id)) {
          this.pendingApprovals.delete(request.id);
          resolve(false);
        }
      }, 5 * 60 * 1000);
    });
  }

  resolveApproval(id: string, approved: boolean): boolean {
    const pending = this.pendingApprovals.get(id);
    if (!pending) return false;
    this.pendingApprovals.delete(id);
    pending.resolve(approved);

    // Notify all clients
    const message = JSON.stringify({
      type: 'approval:resolved',
      payload: { id, approved },
    });
    for (const ws of this.connectedClients) {
      if (ws.readyState === 1) ws.send(message);
    }

    return true;
  }

  broadcast(event: string, payload: unknown): void {
    const message = JSON.stringify({ type: event, payload });
    for (const ws of this.connectedClients) {
      if (ws.readyState === 1) ws.send(message);
    }
  }
}

// Singleton
export const safetyLayer = new SafetyLayer();
