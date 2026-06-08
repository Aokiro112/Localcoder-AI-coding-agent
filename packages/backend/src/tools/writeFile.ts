import fs from 'fs-extra';
import path from 'path';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';
import { DiffService } from '../services/DiffService';
import { resolvePath } from './readFile';

export const writeFileTool: Tool = {
  name: 'writeFile',
  description:
    'Write content to an existing file. The file must already exist. Shows a diff of changes. Use createFile for new files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to write.' },
      content: { type: 'string', description: 'New content to write to the file.' },
    },
    required: ['path', 'content'],
  },
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const filePath = resolvePath(input.path as string, workspacePath);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return {
          success: false,
          error: `File not found: ${filePath}. Use createFile to create new files.`,
        };
      }
      const oldContent = await fs.readFile(filePath, 'utf-8');
      const newContent = input.content as string;
      const diff = DiffService.createDiff(oldContent, newContent, path.basename(filePath));

      await fs.writeFile(filePath, newContent, 'utf-8');

      return {
        success: true,
        output: {
          path: filePath,
          diff,
          linesChanged: diff.hunks.reduce((acc, h) => acc + h.changes.length, 0),
        },
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
