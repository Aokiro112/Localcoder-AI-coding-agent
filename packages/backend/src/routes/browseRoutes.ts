import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export const browseRouter = Router();

// GET /api/browse?path=C:\
// Returns directory listing for the given path, or drives if path is empty
browseRouter.get('/', async (req, res) => {
  const reqPath = (req.query.path as string | undefined) ?? '';

  try {
    // If no path given, return Windows drives (or home on Unix)
    if (!reqPath || reqPath === '/') {
      if (process.platform === 'win32') {
        const drives = await getWindowsDrives();
        return res.json({
          path: '',
          parent: null,
          entries: drives,
          isRoot: true,
        });
      } else {
        // Unix — start from home
        const home = os.homedir();
        return res.redirect(`/api/browse?path=${encodeURIComponent(home)}`);
      }
    }

    const fullPath = path.resolve(reqPath);
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      return res.status(404).json({ error: `Path not found: ${fullPath}` });
    }

    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Not a directory: ${fullPath}` });
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(fullPath, e.name),
        type: 'directory' as const,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = path.dirname(fullPath);
    const isRootDrive = fullPath === parentPath; // e.g. C:\ -> C:\

    return res.json({
      path: fullPath,
      parent: isRootDrive ? null : parentPath,
      entries: dirs,
      isRoot: false,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/browse/home — returns home directory path
browseRouter.get('/home', (_req, res) => {
  res.json({ home: os.homedir(), desktop: path.join(os.homedir(), 'Desktop') });
});

// POST /api/browse/locate-dropped
browseRouter.post('/locate-dropped', async (req, res) => {
  const { folderName, contents } = req.body as {
    folderName: string;
    contents: { name: string; type: 'file' | 'directory'; size?: number }[];
  };

  if (!folderName) {
    res.status(400).json({ error: 'folderName is required' });
    return;
  }

  try {
    const matchedPath = await locateFolder(folderName, contents || []);
    if (matchedPath) {
      res.json({ path: matchedPath });
    } else {
      res.status(404).json({ error: `Could not locate folder "${folderName}" on disk.` });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

async function locateFolder(
  folderName: string,
  contents: { name: string; type: 'file' | 'directory'; size?: number }[]
): Promise<string | null> {
  const searchRoots = new Set<string>();

  // 1. Current app parent & process cwd
  searchRoots.add(path.dirname(process.cwd()));
  searchRoots.add(process.cwd());

  // 2. Home dir and direct subdirectories
  const home = os.homedir();
  searchRoots.add(home);
  try {
    const homeChildren = await fs.readdir(home, { withFileTypes: true });
    for (const child of homeChildren) {
      if (child.isDirectory() && !child.name.startsWith('.')) {
        searchRoots.add(path.join(home, child.name));
      }
    }
  } catch {
    // ignore
  }

  // 3. Drives (Windows) or root (Unix)
  if (process.platform === 'win32') {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    await Promise.all(
      alphabet.map(async (letter) => {
        const drivePath = `${letter}:\\`;
        try {
          await fs.access(drivePath);
          searchRoots.add(drivePath);
          const driveChildren = await fs.readdir(drivePath, { withFileTypes: true });
          for (const child of driveChildren) {
            if (
              child.isDirectory() &&
              !child.name.startsWith('$') &&
              !child.name.startsWith('.')
            ) {
              searchRoots.add(path.join(drivePath, child.name));
            }
          }
        } catch {
          // ignore
        }
      })
    );
  } else {
    searchRoots.add('/');
  }

  const candidates: string[] = [];

  for (const root of searchRoots) {
    const candidatePath = path.join(root, folderName);
    try {
      const exists = await fs.pathExists(candidatePath);
      if (!exists) continue;
      const stat = await fs.stat(candidatePath);
      if (!stat.isDirectory()) continue;

      // Verify contents match
      const localEntries = await fs.readdir(candidatePath);
      let matchCount = 0;
      for (const exp of contents) {
        if (localEntries.includes(exp.name)) {
          matchCount++;
        }
      }

      if (contents.length === 0 || matchCount > 0) {
        candidates.push(candidatePath);
      }
    } catch {
      // ignore
    }
  }

  if (candidates.length > 0) {
    return candidates[0];
  }
  return null;
}

async function getWindowsDrives(): Promise<{ name: string; path: string; type: 'drive' }[]> {
  const drives: { name: string; path: string; type: 'drive' }[] = [];
  // Check A-Z
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  await Promise.all(
    alphabet.map(async (letter) => {
      const drivePath = `${letter}:\\`;
      try {
        await fs.access(drivePath);
        drives.push({ name: `${letter}:`, path: drivePath, type: 'drive' });
      } catch {
        // drive doesn't exist
      }
    }),
  );
  return drives.sort((a, b) => a.name.localeCompare(b.name));
}
