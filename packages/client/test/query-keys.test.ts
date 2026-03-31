import { describe, it, expect } from 'vitest';
import { queryKeys } from '../src/config/query-keys';

describe('query-keys', () => {
  describe('namespaces exist', () => {
    it('has settings namespace', () => {
      expect(queryKeys.settings).toBeDefined();
    });

    it('has account namespace', () => {
      expect(queryKeys.account).toBeDefined();
    });

    it('has docs namespace', () => {
      expect(queryKeys.docs).toBeDefined();
    });

    it('has tasks namespace', () => {
      expect(queryKeys.tasks).toBeDefined();
    });

    it('has drive namespace', () => {
      expect(queryKeys.drive).toBeDefined();
    });

    it('has crm namespace', () => {
      expect(queryKeys.crm).toBeDefined();
    });

    it('has hr namespace', () => {
      expect(queryKeys.hr).toBeDefined();
    });

    it('has sign namespace', () => {
      expect(queryKeys.sign).toBeDefined();
    });

    it('has tables namespace', () => {
      expect(queryKeys.tables).toBeDefined();
    });

    it('has admin namespace', () => {
      expect(queryKeys.admin).toBeDefined();
    });
  });

  describe('function keys return arrays', () => {
    it('docs.detail returns array with id', () => {
      const key = queryKeys.docs.detail('doc-1');
      expect(Array.isArray(key)).toBe(true);
      expect(key).toEqual(['docs', 'detail', 'doc-1']);
    });

    it('tasks.detail returns array with id', () => {
      const key = queryKeys.tasks.detail('task-1');
      expect(Array.isArray(key)).toBe(true);
      expect(key).toEqual(['tasks', 'detail', 'task-1']);
    });

    it('drive.items returns array with parentId', () => {
      const key = queryKeys.drive.items('folder-1');
      expect(key).toEqual(['drive', 'items', 'folder-1']);
    });

    it('drive.items defaults to root when no parentId', () => {
      const key = queryKeys.drive.items(null);
      expect(key).toEqual(['drive', 'items', 'root']);
    });

    it('search.global returns array with query', () => {
      const key = queryKeys.search.global('test');
      expect(key).toEqual(['search', 'global', 'test']);
    });

    it('crm.contacts.detail returns array with id', () => {
      const key = queryKeys.crm.contacts.detail('c-1');
      expect(key).toEqual(['crm', 'contacts', 'c-1']);
    });

    it('hr.employees.list returns array with filters', () => {
      const key = queryKeys.hr.employees.list('active');
      expect(key).toEqual(['hr', 'employees', 'list', 'active']);
    });
  });

  describe('keys are unique', () => {
    it('top-level .all keys are all unique', () => {
      const allKeys = [
        queryKeys.settings.all,
        queryKeys.account.all,
        queryKeys.docs.all,
        queryKeys.tasks.all,
        queryKeys.drive.all,
        queryKeys.crm.all,
        queryKeys.hr.all,
        queryKeys.sign.all,
        queryKeys.tables.all,
        queryKeys.admin.all,
        queryKeys.drawings.all,
      ];
      const serialized = allKeys.map((k) => JSON.stringify(k));
      const unique = new Set(serialized);
      expect(unique.size).toBe(serialized.length);
    });

    it('static array keys within a namespace are unique', () => {
      const taskKeys = [
        queryKeys.tasks.all,
        queryKeys.tasks.widget,
        queryKeys.tasks.counts,
        queryKeys.tasks.projects,
        queryKeys.tasks.templates,
      ];
      const serialized = taskKeys.map((k) => JSON.stringify(k));
      const unique = new Set(serialized);
      expect(unique.size).toBe(serialized.length);
    });
  });

  describe('readonly arrays', () => {
    it('settings.all is a readonly tuple', () => {
      const key = queryKeys.settings.all;
      expect(key).toEqual(['settings']);
      // TypeScript enforces readonly, but we can verify the value
      expect(key[0]).toBe('settings');
    });

    it('docs.list is a readonly tuple', () => {
      const key = queryKeys.docs.list;
      expect(key).toEqual(['docs', 'list']);
    });
  });
});
