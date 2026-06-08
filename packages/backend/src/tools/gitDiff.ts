import { execa } from 'execa';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';

export const gitDiffTool: Tool = {
  name: 'gitDiff',
  description:
    'Get the git diff for the workspace. Can diff unstaged changes, staged changes, or a specific file.',
  inputSchema: {
    type: 'object',
    properties: {
      staged: {
        type: 'boolean',
        description: 'If true, shows staged (--cached) diff. Default: false.',
      },
      file: {
        type: 'string',
        description: 'Optional specific file to diff.',
      },
    },
    required: [],
  },
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const args = ['diff'];
      if (input.staged) args.push('--cached');
      if (input.file) args.push('--', input.file as string);

      const { stdout, exitCode } = await execa('git', args, {
        cwd: workspacePath,
        reject: false,
      });

      if (exitCode !== 0 && !stdout) {
        return { success: false, error: 'Not a git repository or git not available.' };
      }

      return {
        success: true,
        output: {
          diff: stdout,
          isEmpty: stdout.trim() === '',
          staged: !!input.staged,
        },
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
