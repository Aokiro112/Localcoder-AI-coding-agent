import { execa } from 'execa';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';

export const runCommandTool: Tool = {
  name: 'runCommand',
  description:
    'Execute a terminal command in the workspace directory. Captures stdout, stderr, and exit code. Dangerous commands (rm -rf, format, shutdown, etc.) require user approval.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute.' },
      cwd: {
        type: 'string',
        description: 'Working directory (defaults to workspace root).',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000).',
      },
    },
    required: ['command'],
  },
  // requiresApproval is set dynamically in AgentOrchestrator based on SafetyLayer.isDangerousCommand
  requiresApproval: false,
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const command = input.command as string;
      const cwd = (input.cwd as string | undefined) ?? workspacePath;
      const timeout = typeof input.timeout === 'number' ? input.timeout : 30000;

      const result = await execa(command, {
        shell: true,
        cwd,
        timeout,
        reject: false,
        all: true,
        windowsHide: true,
      });

      return {
        success: result.exitCode === 0,
        output: {
          command,
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          exitCode: result.exitCode ?? -1,
          timedOut: result.timedOut ?? false,
        },
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
