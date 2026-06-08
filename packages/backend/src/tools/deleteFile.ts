import fs from 'fs-extra';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';
import { resolvePath } from './readFile';

export const deleteFileTool: Tool = {
  name: 'deleteFile',
  description:
    'Delete a file or directory. ALWAYS requires user approval before execution.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file or directory to delete.' },
    },
    required: ['path'],
  },
  requiresApproval: true,
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const filePath = resolvePath(input.path as string, workspacePath);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return { success: false, error: `Path not found: ${filePath}` };
      }
      await fs.remove(filePath);
      return { success: true, output: { path: filePath, deleted: true } };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
