import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';
import { requireUuidParam, UUID_REGEX } from '../src/middleware/require-uuid';
import { mockRes } from './helpers/test-utils';

describe('UUID_REGEX', () => {
  it.each([
    ['00000000-0000-0000-0000-000000000000', true],
    ['1cea6eeb-a034-413f-b41b-d357012fa6ec', true],
    ['1CEA6EEB-A034-413F-B41B-D357012FA6EC', true],
    ['not-a-uuid', false],
    ['employees', false],
    ['1cea6eeb-a034-413f-b41b-d357012fa6e', false],   // one char short
    ['1cea6eeb-a034-413f-b41b-d357012fa6ecx', false], // one char extra
    ['', false],
  ])('UUID_REGEX.test(%s) === %s', (s, expected) => {
    expect(UUID_REGEX.test(s)).toBe(expected);
  });
});

describe('requireUuidParam middleware', () => {
  it('400 when the param is missing', () => {
    const req = { params: {} } as Request;
    const res = mockRes();
    const next = vi.fn();
    requireUuidParam('id')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_UUID' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('400 when the param is not a UUID (the /hr/employees bug)', () => {
    const req = { params: { id: 'employees' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    requireUuidParam('id')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes when the param is a valid UUID', () => {
    const req = { params: { id: '00000000-0000-0000-0000-000000000000' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    requireUuidParam('id')(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('respects a custom paramName', () => {
    const req = { params: { tenantId: 'bad' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    requireUuidParam('tenantId')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('tenantId'),
    }));
  });
});
