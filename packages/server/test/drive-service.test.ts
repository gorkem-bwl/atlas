import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../src/config/database';

// Mock filesystem operations
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  unlinkSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

import * as driveService from '../src/apps/drive/service';

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Creates a mock db chain where every method returns a thenable that
 * resolves to `resolvedValue`. This lets destructuring like
 * `const [x] = await db.select().from().where()` work regardless of
 * which method terminates the chain.
 */
function mockDbChain(resolvedValue: any) {
  const chain: any = {};
  const methods = ['from', 'where', 'orderBy', 'limit'];
  for (const method of methods) {
    chain[method] = vi.fn().mockImplementation(() => chain);
  }
  // Make the chain itself thenable so `await chain` resolves to the value
  chain.then = (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject);
  return chain;
}

// TODO: re-enable once the test db mock at test/setup.ts is extended to
// stub db.execute() and db.transaction() — drive items.service uses raw
// recursive-CTE SQL for soft-delete that the current mock can't satisfy.
// Better long-term: migrate this suite to test/integration/ where a real
// Postgres handles it.
describe.skip('drive service — uploadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a file record with the correct fields', async () => {
    const mockCreated = { id: 'file-1', name: 'report.pdf', type: 'file', mimeType: 'application/pdf', size: 2048 };

    // Mock the select for max sortOrder
    const selectChain = mockDbChain([{ max: 5 }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    // Mock the insert chain
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockCreated]),
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreated]),
        }),
      }),
    } as any);

    const result = await driveService.uploadFile('u1', 'a1', {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      parentId: null,
      storagePath: 'u1_12345_report.pdf',
    });

    expect(result).toEqual(mockCreated);
    expect(db.insert).toHaveBeenCalled();
  });

  it('assigns sortOrder as max + 1', async () => {
    const selectChain = mockDbChain([{ max: 10 }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const valuesArg: any[] = [];
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockImplementation((v) => {
        valuesArg.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: 'new', sortOrder: 11 }]) };
      }),
    } as any);

    await driveService.uploadFile('u1', 'a1', {
      name: 'file.txt',
      mimeType: 'text/plain',
      size: 100,
      parentId: null,
      storagePath: 'path.txt',
    });

    expect(valuesArg[0]).toEqual(expect.objectContaining({ sortOrder: 11, type: 'file' }));
  });
});

describe.skip('drive service — listItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalized items for a root folder query', async () => {
    const rawItems = [
      { id: '1', name: 'folder', type: 'folder', tags: '[]' },
      { id: '2', name: 'file.txt', type: 'file', tags: '["important"]' },
    ];

    const chain = mockDbChain(rawItems);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const items = await driveService.listItems('u1', null);

    expect(db.select).toHaveBeenCalled();
    expect(items).toHaveLength(2);
    // Tags should be parsed from JSON strings to arrays
    expect(items[0].tags).toEqual([]);
    expect(items[1].tags).toEqual(['important']);
  });

  it('applies parentId filter when provided', async () => {
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    await driveService.listItems('u1', 'folder-123');

    // The where clause should have been called with conditions including parentId
    expect(chain.where).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
  });
});

describe.skip('drive service — deleteItem (moveToTrash)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft deletes by setting isArchived to true', async () => {
    const updatedItem = { id: 'item-1', isArchived: true };

    // updateItem internally does: db.update -> db.select
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedItem]),
        }),
      }),
    } as any);

    const selectChain = mockDbChain([updatedItem]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    await driveService.deleteItem('u1', 'item-1');

    expect(db.update).toHaveBeenCalled();
  });
});

describe.skip('drive service — restoreItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets isArchived to false and returns the restored item', async () => {
    const restoredItem = { id: 'item-1', name: 'restored.txt', isArchived: false, tags: '[]' };

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([restoredItem]),
        }),
      }),
    } as any);

    const selectChain = mockDbChain([restoredItem]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const result = await driveService.restoreItem('u1', 'item-1');

    expect(db.update).toHaveBeenCalled();
    expect(result).toBeTruthy();
    expect(result!.tags).toEqual([]);
  });
});

describe.skip('drive service — permanentDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the database record for a file item', async () => {
    const fileItem = { id: 'item-1', type: 'file', storagePath: null, userId: 'u1', tags: '[]' };

    // getItem: select -> from -> where -> limit
    const selectChain = mockDbChain([fileItem]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as any);

    await driveService.permanentDelete('u1', 'item-1');

    expect(db.delete).toHaveBeenCalled();
  });

  it('returns early when item does not exist', async () => {
    const selectChain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    await driveService.permanentDelete('u1', 'nonexistent');

    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe.skip('drive service — getStorageUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns total bytes and file count', async () => {
    const selectChain = mockDbChain([{ total: 1048576, fileCount: 42 }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const usage = await driveService.getStorageUsage('u1');

    expect(usage).toEqual({ totalBytes: 1048576, fileCount: 42 });
  });

  it('returns zero values when no files exist', async () => {
    const selectChain = mockDbChain([{ total: 0, fileCount: 0 }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const usage = await driveService.getStorageUsage('u1');

    expect(usage).toEqual({ totalBytes: 0, fileCount: 0 });
  });
});

describe.skip('drive service — createFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a folder with type "folder" and given name', async () => {
    const mockFolder = { id: 'folder-1', name: 'My Documents', type: 'folder' };

    const selectChain = mockDbChain([{ max: 3 }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const valuesArg: any[] = [];
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockImplementation((v) => {
        valuesArg.push(v);
        return { returning: vi.fn().mockResolvedValue([mockFolder]) };
      }),
    } as any);

    const result = await driveService.createFolder('u1', 'a1', { name: 'My Documents' });

    expect(result).toEqual(mockFolder);
    expect(valuesArg[0]).toEqual(expect.objectContaining({
      name: 'My Documents',
      type: 'folder',
      sortOrder: 4,
    }));
  });

  it('defaults name to "Untitled folder" when empty', async () => {
    const selectChain = mockDbChain([{ max: -1 }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const valuesArg: any[] = [];
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockImplementation((v) => {
        valuesArg.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: 'f1', name: 'Untitled folder', type: 'folder' }]) };
      }),
    } as any);

    await driveService.createFolder('u1', 'a1', { name: '' });

    expect(valuesArg[0]).toEqual(expect.objectContaining({ name: 'Untitled folder' }));
  });
});

describe.skip('drive service — updateItem (toggleFavourite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets isFavourite to true via updateItem', async () => {
    const updatedItem = { id: 'item-1', isFavourite: true, tags: '["a"]' };

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedItem]),
        }),
      }),
    } as any);

    const selectChain = mockDbChain([updatedItem]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const result = await driveService.updateItem('u1', 'item-1', { isFavourite: true });

    expect(db.update).toHaveBeenCalled();
    expect(result).toBeTruthy();
    expect(result!.isFavourite).toBe(true);
    expect(result!.tags).toEqual(['a']);
  });
});
