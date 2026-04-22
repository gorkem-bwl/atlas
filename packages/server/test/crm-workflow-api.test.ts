import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../src/services/app-permissions.service', () => ({
  canAccessEntity: vi.fn().mockReturnValue(true),
  canAccess: vi.fn().mockReturnValue(true),
  getAppPermission: vi.fn(),
}));

vi.mock('../src/apps/crm/services/workflow.service', () => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  toggleWorkflow: vi.fn(),
  seedExampleWorkflows: vi.fn(),
  appendStep: vi.fn(),
  updateStep: vi.fn(),
  deleteStep: vi.fn(),
  reorderSteps: vi.fn(),
}));

import * as controller from '../src/apps/crm/controllers/workflow.controller';
import * as service from '../src/apps/crm/services/workflow.service';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    auth: { userId: 'user-1', tenantId: 'tenant-1', accountId: 'acc-1', email: 'x@y' } as any,
    crmPerm: { role: 'admin', entityPermissions: { workflows: { view: true, create: true } } } as any,
    params: {},
    body: {},
    ...overrides,
  } as Request;
}

describe('createWorkflow controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects empty steps array with 400', async () => {
    const req = mockReq({ body: { name: 'x', trigger: 'deal_won', steps: [] } });
    const res = mockRes();
    await controller.createWorkflow(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects unknown action with 400', async () => {
    const req = mockReq({
      body: { name: 'x', trigger: 'deal_won', steps: [{ action: 'hack_db', actionConfig: {} }] },
    });
    const res = mockRes();
    await controller.createWorkflow(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects condition with unknown field', async () => {
    const req = mockReq({
      body: {
        name: 'x',
        trigger: 'deal_won',
        steps: [{
          action: 'create_task',
          actionConfig: {},
          condition: { field: 'deal.secret', operator: 'eq', value: 'x' },
        }],
      },
    });
    const res = mockRes();
    await controller.createWorkflow(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calls service on valid payload', async () => {
    (service.createWorkflow as any).mockResolvedValue({ id: 'wf-1', steps: [] });
    const req = mockReq({
      body: {
        name: 'x',
        trigger: 'deal_won',
        steps: [{ action: 'create_task', actionConfig: { taskTitle: 't' } }],
      },
    });
    const res = mockRes();
    await controller.createWorkflow(req, res);
    expect(service.createWorkflow).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('deleteStep controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 LAST_STEP when deleting only step', async () => {
    (service.deleteStep as any).mockResolvedValue({ deleted: false, error: 'LAST_STEP' });
    const req = mockReq({ params: { id: 'wf-1', stepId: 's-1' } });
    const res = mockRes();
    await controller.deleteStep(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when step not found', async () => {
    (service.deleteStep as any).mockResolvedValue({ deleted: false, error: 'NOT_FOUND' });
    const req = mockReq({ params: { id: 'wf-1', stepId: 's-x' } });
    const res = mockRes();
    await controller.deleteStep(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns success on valid delete', async () => {
    (service.deleteStep as any).mockResolvedValue({ deleted: true });
    const req = mockReq({ params: { id: 'wf-1', stepId: 's-1' } });
    const res = mockRes();
    await controller.deleteStep(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
  });
});

describe('reorderSteps controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects missing stepIds with 400', async () => {
    const req = mockReq({ params: { id: 'wf-1' }, body: {} });
    const res = mockRes();
    await controller.reorderSteps(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 MISMATCH when service reports partial list', async () => {
    (service.reorderSteps as any).mockResolvedValue({ ok: false, error: 'MISMATCH' });
    const req = mockReq({
      params: { id: 'wf-1' },
      body: { stepIds: ['11111111-1111-1111-1111-111111111111'] },
    });
    const res = mockRes();
    await controller.reorderSteps(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
