import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  ollamaHost: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:14b',
  port: parseInt(process.env.PORT ?? '3001', 10),
  dbPath: process.env.DB_PATH ?? './localcoder.db',
  defaultWorkspace: process.env.DEFAULT_WORKSPACE ?? '',
  // Directories to ignore during indexing
  ignoredDirs: new Set([
    'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
    '.cache', 'coverage', '.nyc_output', 'out', '.turbo', '.vite',
  ]),
  // File extensions to index
  indexedExtensions: new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
    '.cpp', '.c', '.h', '.cs', '.rb', '.php', '.swift', '.kt',
    '.vue', '.svelte', '.json', '.md', '.yaml', '.yml', '.toml',
    '.env', '.sh', '.bash', '.zsh', '.css', '.scss', '.html',
  ]),
};
