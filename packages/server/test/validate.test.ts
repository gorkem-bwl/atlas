import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../src/openapi/validate';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  return res as Response;
}

describe('validate() middleware', () => {
  it('passes valid params/query/body', () => {
    const mw = validate({
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ limit: z.coerce.number().int() }),
      body: z.object({ name: z.string() }),
    });
    const req = {
      params: { id: '00000000-0000-0000-0000-000000000000' },
      query: { limit: '10' },
      body: { name: 'hi' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('replaces req.body with the parsed (coerced) value', () => {
    const mw = validate({
      body: z.object({ n: z.coerce.number() }),
    });
    const req = { params: {}, query: {}, body: { n: '42' } } as unknown as Request;
    const res = mockRes();
    mw(req, res, vi.fn());
    expect(req.body.n).toBe(42); // coerced to number
  });

  it('400 with issues[] on invalid body', () => {
    const mw = validate({
      body: z.object({ email: z.string().email(), age: z.number().int() }),
    });
    const req = { params: {}, query: {}, body: { email: 'nope', age: 'x' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(payload.code).toBe('VALIDATION_ERROR');
    expect(payload.issues).toBeInstanceOf(Array);
    expect(payload.issues.length).toBeGreaterThanOrEqual(2);
    expect(payload.issues.every((i: { where: string }) => i.where === 'body')).toBe(true);
  });

  it('400 when the query fails but body passes', () => {
    const mw = validate({
      query: z.object({ limit: z.coerce.number().int().min(1).max(100) }),
      body: z.object({ ok: z.boolean() }),
    });
    const req = { params: {}, query: { limit: '500' }, body: { ok: true } } as unknown as Request;
    const res = mockRes();
    mw(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(payload.issues[0].where).toBe('query');
    expect(payload.issues[0].path).toBe('limit');
  });

  it('reports failures from multiple sections together', () => {
    const mw = validate({
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ name: z.string() }),
    });
    const req = {
      params: { id: 'not-a-uuid' },
      query: {},
      body: { name: 123 },
    } as unknown as Request;
    const res = mockRes();
    mw(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    const issues = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0].issues;
    const wheres = issues.map((i: { where: string }) => i.where);
    expect(wheres).toContain('params');
    expect(wheres).toContain('body');
  });

  it('no-op when no schemas are provided', () => {
    const mw = validate({});
    const req = { params: {}, query: {}, body: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
