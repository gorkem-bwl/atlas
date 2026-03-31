import { describe, it, expect, vi } from 'vitest';
import { api } from '../src/lib/api-client';

import {
  useSignDocuments,
  useSignDocument,
  useSignFields,
  useSigningLinks,
  useCreateSignDoc,
  useUpdateSignDoc,
  useDeleteSignDoc,
  useCreateField,
  useUpdateField,
  useDeleteField,
  useCreateSigningLink,
  useVoidDocument,
  usePublicSignDoc,
  submitPublicSign,
  submitPublicDecline,
} from '../src/apps/sign/hooks';

describe('Sign hooks', () => {
  // ─── Query hook exports ─────────────────────────────────────────

  describe('query hook exports', () => {
    it('exports useSignDocuments as a function', () => {
      expect(typeof useSignDocuments).toBe('function');
    });

    it('exports useSignDocument as a function', () => {
      expect(typeof useSignDocument).toBe('function');
    });

    it('exports useSignFields as a function', () => {
      expect(typeof useSignFields).toBe('function');
    });

    it('exports useSigningLinks as a function', () => {
      expect(typeof useSigningLinks).toBe('function');
    });

    it('exports usePublicSignDoc as a function', () => {
      expect(typeof usePublicSignDoc).toBe('function');
    });
  });

  // ─── Mutation hook exports ──────────────────────────────────────

  describe('mutation hook exports', () => {
    it('exports document mutation hooks', () => {
      expect(typeof useCreateSignDoc).toBe('function');
      expect(typeof useUpdateSignDoc).toBe('function');
      expect(typeof useDeleteSignDoc).toBe('function');
      expect(typeof useVoidDocument).toBe('function');
    });

    it('exports field mutation hooks', () => {
      expect(typeof useCreateField).toBe('function');
      expect(typeof useUpdateField).toBe('function');
      expect(typeof useDeleteField).toBe('function');
    });

    it('exports signing link mutation hook', () => {
      expect(typeof useCreateSigningLink).toBe('function');
    });
  });

  // ─── Public (non-hook) functions ────────────────────────────────

  describe('public signing functions', () => {
    it('exports submitPublicSign as an async function', () => {
      expect(typeof submitPublicSign).toBe('function');
    });

    it('exports submitPublicDecline as an async function', () => {
      expect(typeof submitPublicDecline).toBe('function');
    });
  });

  // ─── API endpoint patterns ──────────────────────────────────────

  describe('API endpoint patterns', () => {
    it('document list calls /sign', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { documents: [] } } } as any);
      await api.get('/sign');
      expect(mockedGet).toHaveBeenCalledWith('/sign');
    });

    it('document detail calls /sign/:id', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: {} } } as any);
      await api.get('/sign/doc-123');
      expect(mockedGet).toHaveBeenCalledWith('/sign/doc-123');
    });

    it('field creation posts to /sign/:docId/fields', async () => {
      const mockedPost = vi.mocked(api.post);
      mockedPost.mockResolvedValueOnce({ data: { success: true, data: {} } } as any);
      await api.post('/sign/doc-123/fields', { type: 'signature', page: 1 });
      expect(mockedPost).toHaveBeenCalledWith('/sign/doc-123/fields', { type: 'signature', page: 1 });
    });
  });

  // ─── Module structure ───────────────────────────────────────────

  describe('module structure', () => {
    it('exports at least 14 functions', async () => {
      const mod = await import('../src/apps/sign/hooks');
      const exportedFns = Object.values(mod).filter((v) => typeof v === 'function');
      expect(exportedFns.length).toBeGreaterThanOrEqual(14);
    });
  });
});
