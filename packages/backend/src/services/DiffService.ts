import { createPatch, type ParsedDiff, parsePatch } from 'diff';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: { type: 'add' | 'del' | 'normal'; content: string }[];
}

export interface FileDiff {
  filename: string;
  oldContent: string;
  newContent: string;
  unified: string;
  hunks: DiffHunk[];
}

export class DiffService {
  static createDiff(oldContent: string, newContent: string, filename: string): FileDiff {
    const unified = createPatch(filename, oldContent, newContent, 'old', 'new');

    const parsed: ParsedDiff[] = parsePatch(unified);
    const hunks: DiffHunk[] = (parsed[0]?.hunks ?? []).map((h) => ({
      oldStart: h.oldStart,
      oldLines: h.oldLines,
      newStart: h.newStart,
      newLines: h.newLines,
      changes: h.lines.map((line) => ({
        type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'normal',
        content: line.slice(1),
      })),
    }));

    return { filename, oldContent, newContent, unified, hunks };
  }
}
