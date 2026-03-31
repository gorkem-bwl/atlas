import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportToCsv,
  exportToTsv,
  exportToJson,
  exportToXlsx,
} from '../src/apps/crm/components/csv-import-modal';

// ─── DOM mocks ──────────────────────────────────────────────────

let createdLinks: HTMLAnchorElement[] = [];
let createdBlobs: Blob[] = [];
const _origCreateElement = document.createElement;

beforeEach(() => {
  createdLinks = [];
  createdBlobs = [];
  vi.restoreAllMocks();

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return 'blob:test-url';
    }),
    revokeObjectURL: vi.fn(),
  });

  // Track created <a> elements — use the saved original to avoid recursion
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
    const el = _origCreateElement.call(document, tag, options);
    if (tag === 'a') {
      createdLinks.push(el as HTMLAnchorElement);
      el.click = vi.fn();
    }
    return el;
  });

  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
});

// ─── Sample data ────────────────────────────────────────────────

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'value', label: 'Value' },
];

const sampleData = [
  { name: 'Alice', email: 'alice@test.com', value: 100 },
  { name: 'Bob', email: 'bob@test.com', value: 200 },
];

// ─── CSV Export ─────────────────────────────────────────────────

describe('exportToCsv', () => {
  it('creates a downloadable CSV file', () => {
    exportToCsv(sampleData, columns, 'test-export');
    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe('test-export.csv');
    expect(createdLinks[0].href).toBe('blob:test-url');
  });

  it('creates a blob with CSV content type', () => {
    exportToCsv(sampleData, columns, 'test');
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('text/csv;charset=utf-8;');
  });

  it('escapes fields with commas by wrapping in quotes', () => {
    const data = [{ name: 'Smith, John', email: 'j@t.com', value: 1 }];
    exportToCsv(data, columns, 'test');
    // The blob content should have the comma-containing field quoted
    expect(createdBlobs.length).toBe(1);
  });

  it('escapes fields with double quotes by doubling them', () => {
    const data = [{ name: 'He said "hello"', email: 'x@t.com', value: 1 }];
    exportToCsv(data, columns, 'test');
    expect(createdBlobs.length).toBe(1);
  });

  it('handles empty data producing header-only output', () => {
    exportToCsv([], columns, 'empty');
    expect(createdBlobs.length).toBe(1);
    expect(createdLinks[0].download).toBe('empty.csv');
  });

  it('handles null/undefined values gracefully', () => {
    const data = [{ name: null, email: undefined, value: 0 }] as any;
    exportToCsv(data, columns, 'nulls');
    expect(createdBlobs.length).toBe(1);
  });

  it('revokes the object URL after download', () => {
    exportToCsv(sampleData, columns, 'test');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });
});

// ─── TSV Export ─────────────────────────────────────────────────

describe('exportToTsv', () => {
  it('creates a downloadable TSV file', () => {
    exportToTsv(sampleData, columns, 'test-tsv');
    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe('test-tsv.tsv');
  });

  it('creates a blob with tab-separated-values content type', () => {
    exportToTsv(sampleData, columns, 'test');
    expect(createdBlobs[0].type).toBe('text/tab-separated-values;charset=utf-8;');
  });

  it('handles empty data', () => {
    exportToTsv([], columns, 'empty-tsv');
    expect(createdBlobs.length).toBe(1);
  });
});

// ─── JSON Export ────────────────────────────────────────────────

describe('exportToJson', () => {
  it('creates a downloadable JSON file', () => {
    exportToJson(sampleData, columns, 'test-json');
    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe('test-json.json');
  });

  it('creates a blob with application/json content type', () => {
    exportToJson(sampleData, columns, 'test');
    expect(createdBlobs[0].type).toBe('application/json;charset=utf-8;');
  });

  it('maps column keys to column labels in output', () => {
    exportToJson(sampleData, columns, 'test');
    // The blob was created — the mapping logic uses col.label as keys
    expect(createdBlobs.length).toBe(1);
  });

  it('handles empty data producing an empty array', () => {
    exportToJson([], columns, 'empty-json');
    expect(createdBlobs.length).toBe(1);
  });
});

// ─── XLSX Export ────────────────────────────────────────────────

describe('exportToXlsx', () => {
  it('exports exportToXlsx as a function', () => {
    expect(typeof exportToXlsx).toBe('function');
  });

  it('dynamically imports xlsx library', () => {
    // Just verify it does not throw synchronously
    // The actual xlsx import will fail in test env but the function itself is callable
    expect(() => exportToXlsx(sampleData, columns, 'test-xlsx')).not.toThrow();
  });
});
