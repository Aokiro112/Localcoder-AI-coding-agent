import fs from 'fs-extra';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { config } from '../config';
import { IndexStore } from './IndexStore';
import { safetyLayer } from '../agent/SafetyLayer';

const IMPORT_PATTERNS = [
  // ES modules: import ... from '...'
  /import\s+(?:[\w*{}\s,]+from\s+)?['"]([^'"]+)['"]/g,
  // require('...')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Python: from ... import / import ...
  /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm,
];

const EXPORT_PATTERNS = [
  // export default X / export { X } / export const X
  /export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface|enum)?\s*([\w]+)/g,
  // module.exports
  /module\.exports\s*=\s*(?:{([^}]+)}|(\w+))/g,
];

function detectLanguage(ext: string): string | null {
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.json': 'json',
    '.md': 'markdown',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.sh': 'shell',
    '.bash': 'shell',
    '.css': 'css',
    '.scss': 'scss',
    '.html': 'html',
  };
  return map[ext] ?? null;
}

function extractImports(content: string): string[] {
  const imports = new Set<string>();
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const imp = match[1] ?? match[2];
      if (imp && !imp.startsWith('.')) continue; // skip node_modules imports for now
      if (imp) imports.add(imp);
    }
  }
  return Array.from(imports).slice(0, 50);
}

function extractExports(content: string): string[] {
  const exports = new Set<string>();
  for (const pattern of EXPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const exp = match[1] ?? match[2];
      if (exp) exports.add(exp.trim());
    }
  }
  return Array.from(exports).slice(0, 50);
}

export class ProjectIndexer {
  private store: IndexStore;
  private watcher: FSWatcher | null = null;
  private workspacePath = '';

  constructor() {
    this.store = new IndexStore();
  }

  async indexProject(workspacePath: string): Promise<{ indexed: number; errors: number }> {
    this.workspacePath = workspacePath;
    this.store.clear();

    let indexed = 0;
    let errors = 0;

    await this.walkAndIndex(workspacePath, workspacePath, (ok) => {
      if (ok) indexed++;
      else errors++;
    });

    safetyLayer.broadcast('indexer:done', {
      workspacePath,
      indexed,
      errors,
      totalFiles: this.store.count(),
    });

    this.startWatcher(workspacePath);

    return { indexed, errors };
  }

  private async walkAndIndex(
    dirPath: string,
    workspacePath: string,
    callback: (success: boolean) => void,
  ): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (config.ignoredDirs.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.walkAndIndex(fullPath, workspacePath, callback);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!config.indexedExtensions.has(ext)) continue;

        try {
          await this.indexFile(fullPath, workspacePath);
          callback(true);
        } catch {
          callback(false);
        }
      }
    }
  }

  private async indexFile(filePath: string, workspacePath: string): Promise<void> {
    const stat = await fs.stat(filePath);
    if (stat.size > 1024 * 1024) return; // skip files > 1MB

    const ext = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(workspacePath, filePath);
    const language = detectLanguage(ext);

    let imports: string[] = [];
    let exports: string[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.vue', '.svelte'].includes(ext)) {
        imports = extractImports(content);
        exports = extractExports(content);
      }
    } catch {
      // binary or unreadable
    }

    this.store.upsertFile({
      path: relativePath,
      language,
      imports,
      exports,
      size: stat.size,
      lastModified: stat.mtimeMs,
    });
  }

  private startWatcher(workspacePath: string): void {
    if (this.watcher) {
      void this.watcher.close();
    }

    this.watcher = chokidar.watch(workspacePath, {
      ignored: /(node_modules|\.git|dist|build)/,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('add', (filePath) => {
      void this.indexFile(filePath, workspacePath);
      safetyLayer.broadcast('indexer:fileAdded', { path: filePath });
    });

    this.watcher.on('change', (filePath) => {
      void this.indexFile(filePath, workspacePath);
      safetyLayer.broadcast('indexer:fileChanged', { path: filePath });
    });

    this.watcher.on('unlink', (filePath) => {
      const rel = path.relative(workspacePath, filePath);
      this.store.removeFile(rel);
      safetyLayer.broadcast('indexer:fileRemoved', { path: filePath });
    });
  }

  getStore(): IndexStore {
    return this.store;
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}

export const projectIndexer = new ProjectIndexer();
