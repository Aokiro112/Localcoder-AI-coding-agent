import { execa } from 'execa';
import { type Tool, type ToolResult } from '../agent/ToolRegistry';

interface RipgrepMatch {
  type: string;
  data: {
    path?: { text: string };
    lines?: { text: string };
    line_number?: number;
    submatches?: { match: { text: string }; start: number; end: number }[];
  };
}

export const searchCodeTool: Tool = {
  name: 'searchCode',
  description:
    'Search through the codebase using ripgrep. Returns matching files and line contexts.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search pattern (supports regex).' },
      filePattern: {
        type: 'string',
        description: 'Optional glob pattern to filter files (e.g., "*.ts").',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Whether the search is case-sensitive (default: false).',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50).',
      },
    },
    required: ['query'],
  },
  async execute(input, workspacePath): Promise<ToolResult> {
    try {
      const query = input.query as string;
      const args = ['--json', '--max-count', '5'];

      if (!input.caseSensitive) args.push('--ignore-case');
      if (input.filePattern) args.push('--glob', input.filePattern as string);

      const maxResults = typeof input.maxResults === 'number' ? input.maxResults : 50;
      args.push('--max-filesize', '1M');
      args.push(query, workspacePath);

      const { stdout } = await execa('rg', args, {
        reject: false,
        timeout: 15000,
      });

      const lines = stdout.split('\n').filter((l) => l.trim());
      const results: { file: string; line: number; text: string }[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as RipgrepMatch;
          if (parsed.type === 'match' && parsed.data.path && parsed.data.lines) {
            results.push({
              file: parsed.data.path.text,
              line: parsed.data.line_number ?? 0,
              text: parsed.data.lines.text.trimEnd(),
            });
            if (results.length >= maxResults) break;
          }
        } catch {
          // skip malformed lines
        }
      }

      const fileSet = new Set(results.map((r) => r.file));

      return {
        success: true,
        output: {
          query,
          matchCount: results.length,
          filesMatched: fileSet.size,
          results,
        },
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
