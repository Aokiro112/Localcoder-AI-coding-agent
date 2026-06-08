import fs from 'fs-extra';
import path from 'path';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';

export const readFileTool: Tool = {
  name: 'readFile',
  description: 'Read the contents of a file at a given path within the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative or absolute path to the file to read.',
      },
    },
    required: ['path'],
  },
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const filePath = resolvePath(input.path as string, workspacePath);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        return { success: false, error: `Path is a directory, not a file: ${filePath}` };
      }
      // Limit read size to 500KB to avoid overwhelming the model
      if (stat.size > 500 * 1024) {
        return {
          success: false,
          error: `File too large (${Math.round(stat.size / 1024)}KB). Use searchCode to find specific sections.`,
        };
      }
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        success: true,
        output: { path: filePath, content, size: stat.size, lines: content.split('\n').length },
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};

export function resolvePath(filePath: string, workspacePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(workspacePath, filePath);
}
