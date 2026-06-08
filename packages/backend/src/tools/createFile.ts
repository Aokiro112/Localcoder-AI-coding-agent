import fs from 'fs-extra';
import path from 'path';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';
import { resolvePath } from './readFile';

export const createFileTool: Tool = {
  name: 'createFile',
  description: 'Create a new file with the given content. Fails if the file already exists.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path of the new file to create.' },
      content: { type: 'string', description: 'Content to write into the new file.' },
    },
    required: ['path', 'content'],
  },
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const filePath = resolvePath(input.path as string, workspacePath);
      const exists = await fs.pathExists(filePath);
      if (exists) {
        return {
          success: false,
          error: `File already exists: ${filePath}. Use writeFile to modify it.`,
        };
      }
      await fs.ensureDir(path.dirname(filePath));
      await fs.outputFile(filePath, input.content as string, 'utf-8');
      return { success: true, output: { path: filePath, created: true } };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
