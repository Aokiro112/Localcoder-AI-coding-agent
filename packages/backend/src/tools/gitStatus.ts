import { execa } from 'execa';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';

export const gitStatusTool: Tool = {
  name: 'gitStatus',
  description: 'Get the current git status of the workspace (staged, unstaged, untracked files).',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_input, workspacePath): Promise<ToolResult> {
    try {
      const { stdout, exitCode } = await execa('git', ['status', '--short', '--branch'], {
        cwd: workspacePath,
        reject: false,
      });
      if (exitCode !== 0) {
        return { success: false, error: 'Not a git repository or git not available.' };
      }
      const lines = stdout.split('\n').filter(Boolean);
      const branch = lines[0]?.replace('## ', '') ?? 'unknown';
      const changes = lines.slice(1).map((line) => ({
        status: line.slice(0, 2).trim(),
        file: line.slice(3),
      }));
      return { success: true, output: { branch, changes, summary: stdout } };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
