import fs from 'fs-extra';
import path from 'path';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';
import { config } from '../config';
import { resolvePath } from './readFile';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

async function buildTree(
  dirPath: string,
  workspacePath: string,
  depth: number = 0,
  maxDepth: number = 4,
): Promise<FileNode[]> {
  if (depth > maxDepth) return [];

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (config.ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(workspacePath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, workspacePath, depth + 1, maxDepth);
      nodes.push({ name: entry.name, path: relativePath, type: 'directory', children });
    } else {
      const stat = await fs.stat(fullPath);
      nodes.push({ name: entry.name, path: relativePath, type: 'file', size: stat.size });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function treeToString(nodes: FileNode[], indent = ''): string {
  return nodes
    .map((n) => {
      const prefix = n.type === 'directory' ? '📁 ' : '📄 ';
      const line = `${indent}${prefix}${n.name}`;
      if (n.children && n.children.length > 0) {
        return line + '\n' + treeToString(n.children, indent + '  ');
      }
      return line;
    })
    .join('\n');
}

export const listDirectoryTool: Tool = {
  name: 'listDirectory',
  description: 'List the contents of a directory as a tree. Respects .gitignore patterns.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list. Use "." for workspace root.',
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth to traverse (default: 4).',
      },
    },
    required: ['path'],
  },
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const dirPath = resolvePath(input.path as string, workspacePath);
      const exists = await fs.pathExists(dirPath);
      if (!exists) {
        return { success: false, error: `Directory not found: ${dirPath}` };
      }
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        return { success: false, error: `Path is not a directory: ${dirPath}` };
      }
      const maxDepth = typeof input.maxDepth === 'number' ? input.maxDepth : 4;
      const tree = await buildTree(dirPath, workspacePath, 0, maxDepth);
      const treeString = treeToString(tree);
      return { success: true, output: { path: dirPath, tree, treeString } };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
