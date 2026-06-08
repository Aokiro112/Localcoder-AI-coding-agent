import { randomUUID } from 'crypto';
import { OllamaClient, type OllamaMessage } from './OllamaClient';
import { ToolRegistry } from './ToolRegistry';
import { safetyLayer } from './SafetyLayer';
import { MemoryStore } from '../memory/MemoryStore';
import { getDb } from '../db/database';

export interface AgentTask {
  id: string;
  prompt: string;
  workspacePath: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'rejected';
  startedAt: number;
  finishedAt?: number;
}

const MAX_ITERATIONS = 20;

export class AgentOrchestrator {
  private ollama: OllamaClient;
  private tools: ToolRegistry;
  private memory: MemoryStore;

  constructor(tools: ToolRegistry) {
    this.ollama = new OllamaClient();
    this.tools = tools;
    this.memory = new MemoryStore();
  }

  async runTask(task: AgentTask): Promise<void> {
    const db = getDb();
    const taskId = task.id;
    const toolCallRecords: ToolCallRecord[] = [];

    // Persist task
    db.prepare(
      `INSERT OR REPLACE INTO tasks (id, prompt, status, tool_calls, created_at)
       VALUES (?, ?, 'running', '[]', unixepoch())`
    ).run(taskId, task.prompt);

    const emit = (event: string, payload: unknown) =>
      safetyLayer.broadcast(event, payload);

    emit('task:start', { taskId, prompt: task.prompt });

    try {
      const memoryContext = this.memory.buildContextString();
      const systemPrompt = this.buildSystemPrompt(task.workspacePath, memoryContext);

      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: task.prompt },
      ];

      const toolSchemas = this.tools.getToolSchemas();
      let iterations = 0;

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        emit('agent:thinking', { taskId, iteration: iterations });

        const response = await this.ollama.chat(messages, toolSchemas, (token) => {
          emit('agent:token', { taskId, token });
        });

        messages.push({
          role: 'assistant',
          content: response.message.content,
        });

        // No tool calls — agent is done
        if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
          emit('agent:done', {
            taskId,
            content: response.message.content,
            toolCalls: toolCallRecords,
          });
          db.prepare(
            `UPDATE tasks SET status='done', result=?, tool_calls=?, finished_at=unixepoch() WHERE id=?`
          ).run(response.message.content, JSON.stringify(toolCallRecords), taskId);
          return;
        }

        // Execute all tool calls
        for (const call of response.message.tool_calls) {
          const callId = call.id ?? randomUUID();
          let input: Record<string, unknown> = {};

          try {
            input = JSON.parse(call.function.arguments) as Record<string, unknown>;
          } catch {
            input = {};
          }

          const record: ToolCallRecord = {
            id: callId,
            name: call.function.name,
            input,
            status: 'pending',
            startedAt: Date.now(),
          };
          toolCallRecords.push(record);

          emit('tool:start', { taskId, toolCall: record });

          const tool = this.tools.getTool(call.function.name);
          if (!tool) {
            record.status = 'error';
            record.error = `Unknown tool: ${call.function.name}`;
            record.finishedAt = Date.now();
            emit('tool:error', { taskId, toolCall: record });
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: record.error }),
              tool_call_id: callId,
            });
            continue;
          }

          // Safety check
          let needsApproval = tool.requiresApproval ?? false;
          if (call.function.name === 'runCommand') {
            const cmd = (input.command as string) ?? '';
            if (safetyLayer.isDangerousCommand(cmd)) {
              needsApproval = true;
            }
          }

          if (needsApproval) {
            record.status = 'pending';
            emit('tool:awaitingApproval', { taskId, toolCall: record });

            const approvalId = randomUUID();
            db.prepare(
              `INSERT INTO approvals (id, task_id, type, payload) VALUES (?, ?, ?, ?)`
            ).run(
              approvalId,
              taskId,
              call.function.name,
              JSON.stringify({ toolName: call.function.name, input })
            );

            const approved = await safetyLayer.requestApproval({
              id: approvalId,
              taskId,
              type:
                call.function.name === 'deleteFile'
                  ? 'deleteFile'
                  : 'dangerousCommand',
              description: `Tool "${call.function.name}" with input: ${JSON.stringify(input)}`,
              payload: { toolName: call.function.name, input },
            });

            db.prepare(
              `UPDATE approvals SET status=?, resolved_at=unixepoch() WHERE id=?`
            ).run(approved ? 'approved' : 'rejected', approvalId);

            if (!approved) {
              record.status = 'rejected';
              record.finishedAt = Date.now();
              emit('tool:rejected', { taskId, toolCall: record });
              messages.push({
                role: 'tool',
                content: JSON.stringify({ error: 'User rejected this operation.' }),
                tool_call_id: callId,
              });
              continue;
            }
          }

          record.status = 'running';
          emit('tool:running', { taskId, toolCall: record });

          try {
            const result = await tool.execute(input, task.workspacePath);
            record.status = result.success ? 'success' : 'error';
            record.output = result.output;
            record.error = result.error;
            record.finishedAt = Date.now();

            emit(result.success ? 'tool:success' : 'tool:error', {
              taskId,
              toolCall: record,
            });

            messages.push({
              role: 'tool',
              content: JSON.stringify(
                result.success ? result.output : { error: result.error }
              ),
              tool_call_id: callId,
            });
          } catch (err) {
            record.status = 'error';
            record.error = String(err);
            record.finishedAt = Date.now();
            emit('tool:error', { taskId, toolCall: record });
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: record.error }),
              tool_call_id: callId,
            });
          }
        }

        // Update task progress
        db.prepare(
          `UPDATE tasks SET tool_calls=? WHERE id=?`
        ).run(JSON.stringify(toolCallRecords), taskId);
      }

      // Iteration limit reached
      const limitMsg = `[Agent reached max iterations (${MAX_ITERATIONS}). Last context saved.]`;
      emit('agent:done', { taskId, content: limitMsg, toolCalls: toolCallRecords });
      db.prepare(
        `UPDATE tasks SET status='done', result=?, tool_calls=?, finished_at=unixepoch() WHERE id=?`
      ).run(limitMsg, JSON.stringify(toolCallRecords), taskId);
    } catch (err) {
      const error = String(err);
      emit('agent:error', { taskId, error });
      db.prepare(
        `UPDATE tasks SET status='error', error=?, finished_at=unixepoch() WHERE id=?`
      ).run(error, taskId);
    }
  }

  private buildSystemPrompt(workspacePath: string, memoryContext: string): string {
    return `You are LocalCoder, an autonomous AI coding assistant running entirely locally.
You have access to the user's codebase at: ${workspacePath}

${memoryContext}

## Your Capabilities
You can read files, write files, create files, delete files, list directories, search code with ripgrep, run terminal commands, and check git status/diffs.

## How to Operate
- Think step by step before taking action.
- Use tools to understand the codebase before making changes.
- Always read a file before editing it.
- Show diffs and reasoning before writing files.
- If you need to delete something, always ask for approval (the system will handle this automatically).
- For terminal commands, prefer non-destructive operations. The safety layer will block dangerous commands.
- When you complete a task, summarize what you did clearly.
- If you encounter an error, analyze it and attempt to fix it.

## Response Format
- Use markdown for explanations.
- When writing code changes, explain your reasoning.
- Be concise but thorough.

Now, assist the user with their request.`;
  }
}
