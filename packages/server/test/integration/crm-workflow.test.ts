/**
 * End-to-end integration tests for CRM workflow multi-step chains.
 *
 * Covers:
 *   1. POST /workflows creates workflow + N steps, returns ordered
 *   2. Appending, updating, deleting, reordering steps
 *   3. LAST_STEP / MISMATCH error codes surface correctly
 *   4. Executor actually fires when a matching trigger occurs and
 *      writes the expected side effects (tasks, tags, activities, notifications)
 *      across a multi-step chain with conditions
 *   5. Per-step skip condition honored against live DB data
 *   6. executionCount bumped once per matched workflow, not per step
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestAdmin } from './setup';

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('CRM workflow multi-step (integration)', () => {
  it('creates a workflow with 3 steps and returns them ordered', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    const res = await request(app)
      .post('/api/v1/crm/workflows')
      .set(auth(accessToken))
      .send({
        name: 'Multi-step test',
        trigger: 'deal_won',
        triggerConfig: {},
        steps: [
          { action: 'create_task', actionConfig: { taskTitle: 'Welcome task' } },
          { action: 'add_tag', actionConfig: { tag: 'customer' } },
          { action: 'log_activity', actionConfig: { activityType: 'note', body: 'Deal won' } },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.steps).toHaveLength(3);
    expect(res.body.data.steps.map((s: any) => s.action)).toEqual(['create_task', 'add_tag', 'log_activity']);
    expect(res.body.data.steps.map((s: any) => s.position)).toEqual([0, 1, 2]);
  });

  it('rejects empty steps array with 400', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    await request(app)
      .post('/api/v1/crm/workflows')
      .set(auth(accessToken))
      .send({ name: 'bad', trigger: 'deal_won', steps: [] })
      .expect(400);
  });

  it('rejects unknown action with 400', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    await request(app)
      .post('/api/v1/crm/workflows')
      .set(auth(accessToken))
      .send({
        name: 'bad', trigger: 'deal_won',
        steps: [{ action: 'drop_database', actionConfig: {} }],
      })
      .expect(400);
  });

  it('rejects condition referencing an unallowed field with 400', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    await request(app)
      .post('/api/v1/crm/workflows')
      .set(auth(accessToken))
      .send({
        name: 'bad', trigger: 'deal_won',
        steps: [{
          action: 'create_task',
          actionConfig: { taskTitle: 't' },
          condition: { field: 'deal.secret_field', operator: 'eq', value: 'x' },
        }],
      })
      .expect(400);
  });

  it('appends a step at the next position and GET /:id returns it ordered', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    const { body: { data: wf } } = await request(app)
      .post('/api/v1/crm/workflows')
      .set(auth(accessToken))
      .send({
        name: 'Append test', trigger: 'deal_won',
        steps: [{ action: 'create_task', actionConfig: { taskTitle: 'First' } }],
      })
      .expect(200);

    const appendRes = await request(app)
      .post(`/api/v1/crm/workflows/${wf.id}/steps`)
      .set(auth(accessToken))
      .send({ action: 'add_tag', actionConfig: { tag: 'appended' } })
      .expect(200);

    expect(appendRes.body.data.position).toBe(1);
    expect(appendRes.body.data.action).toBe('add_tag');

    const getRes = await request(app)
      .get(`/api/v1/crm/workflows/${wf.id}`)
      .set(auth(accessToken))
      .expect(200);

    expect(getRes.body.data.steps).toHaveLength(2);
    expect(getRes.body.data.steps.map((s: any) => s.position)).toEqual([0, 1]);
  });

  it('updates a step and persists the new actionConfig', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    const { body: { data: wf } } = await request(app)
      .post('/api/v1/crm/workflows').set(auth(accessToken))
      .send({
        name: 'Update test', trigger: 'deal_won',
        steps: [{ action: 'create_task', actionConfig: { taskTitle: 'Old' } }],
      }).expect(200);
    const stepId = wf.steps[0].id;

    await request(app)
      .patch(`/api/v1/crm/workflows/${wf.id}/steps/${stepId}`)
      .set(auth(accessToken))
      .set('If-Unmodified-Since', wf.updatedAt)
      .send({ actionConfig: { taskTitle: 'New' } })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/v1/crm/workflows/${wf.id}`).set(auth(accessToken)).expect(200);
    expect(getRes.body.data.steps[0].actionConfig.taskTitle).toBe('New');
  });

  it('reorders steps and closes position gaps on delete', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    const { body: { data: wf } } = await request(app)
      .post('/api/v1/crm/workflows').set(auth(accessToken))
      .send({
        name: 'Reorder test', trigger: 'deal_won',
        steps: [
          { action: 'create_task', actionConfig: { taskTitle: 'A' } },
          { action: 'add_tag', actionConfig: { tag: 'B' } },
          { action: 'log_activity', actionConfig: { activityType: 'note', body: 'C' } },
        ],
      }).expect(200);
    const [a, b, c] = wf.steps;

    // Reorder: C, A, B
    await request(app)
      .post(`/api/v1/crm/workflows/${wf.id}/steps/reorder`).set(auth(accessToken))
      .send({ stepIds: [c.id, a.id, b.id] }).expect(200);

    const afterReorder = await request(app)
      .get(`/api/v1/crm/workflows/${wf.id}`).set(auth(accessToken)).expect(200);
    expect(afterReorder.body.data.steps.map((s: any) => s.action)).toEqual(['log_activity', 'create_task', 'add_tag']);

    // Delete middle (was A, now at position 1)
    await request(app)
      .delete(`/api/v1/crm/workflows/${wf.id}/steps/${a.id}`).set(auth(accessToken)).expect(200);

    const afterDelete = await request(app)
      .get(`/api/v1/crm/workflows/${wf.id}`).set(auth(accessToken)).expect(200);
    expect(afterDelete.body.data.steps).toHaveLength(2);
    expect(afterDelete.body.data.steps.map((s: any) => s.position)).toEqual([0, 1]);
    expect(afterDelete.body.data.steps.map((s: any) => s.action)).toEqual(['log_activity', 'add_tag']);
  });

  it('rejects deletion of the only remaining step with 400 LAST_STEP', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    const { body: { data: wf } } = await request(app)
      .post('/api/v1/crm/workflows').set(auth(accessToken))
      .send({
        name: 'Single step', trigger: 'deal_won',
        steps: [{ action: 'create_task', actionConfig: { taskTitle: 't' } }],
      }).expect(200);

    const res = await request(app)
      .delete(`/api/v1/crm/workflows/${wf.id}/steps/${wf.steps[0].id}`)
      .set(auth(accessToken))
      .expect(400);

    expect(res.body.code).toBe('LAST_STEP');
  });

  it('rejects reorder with MISMATCH when stepIds are incomplete', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    const { body: { data: wf } } = await request(app)
      .post('/api/v1/crm/workflows').set(auth(accessToken))
      .send({
        name: 'Partial reorder', trigger: 'deal_won',
        steps: [
          { action: 'create_task', actionConfig: { taskTitle: 'A' } },
          { action: 'add_tag', actionConfig: { tag: 'B' } },
        ],
      }).expect(200);

    const res = await request(app)
      .post(`/api/v1/crm/workflows/${wf.id}/steps/reorder`).set(auth(accessToken))
      .send({ stepIds: [wf.steps[0].id] })
      .expect(400);

    expect(res.body.code).toBe('MISMATCH');
  });

  it('executes a 2-step chain on deal_won and writes side effects', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    // 1. Seed default stages (creates Qualified, Proposal, Won, Lost etc.)
    await request(app)
      .post('/api/v1/crm/stages/seed').set(auth(accessToken)).expect((r: any) => {
        if (![200, 201].includes(r.status)) throw new Error(`seed stages: ${r.status}`);
      });

    const stagesRes = await request(app)
      .get('/api/v1/crm/stages/list').set(auth(accessToken)).expect(200);
    const firstStage = stagesRes.body.data[0] ?? stagesRes.body.data.stages?.[0];
    const stageId = firstStage.id;

    // 2. Create a workflow: on deal_won, create task + add 'customer' tag.
    await request(app)
      .post('/api/v1/crm/workflows').set(auth(accessToken))
      .send({
        name: 'Won chain', trigger: 'deal_won', triggerConfig: {},
        steps: [
          { action: 'create_task', actionConfig: { taskTitle: 'Welcome new customer' } },
          { action: 'add_tag', actionConfig: { tag: 'customer' } },
        ],
      }).expect(200);

    // 3. Create a deal.
    const dealRes = await request(app)
      .post('/api/v1/crm/deals').set(auth(accessToken))
      .send({ title: 'Big deal', value: 50000, stageId })
      .expect((r: any) => { if (![200, 201].includes(r.status)) throw new Error(`create deal: ${r.status}`); });
    const dealId = dealRes.body.data.id;

    // 4. Mark deal won → fires deal_won trigger.
    await request(app)
      .post(`/api/v1/crm/deals/${dealId}/won`).set(auth(accessToken)).expect(200);

    // Give the fire-and-forget executor a moment to commit its writes.
    await new Promise((r) => setTimeout(r, 200));

    // 5. Assert task was created.
    const tasksRes = await request(app)
      .get('/api/v1/work/tasks').set(auth(accessToken)).expect(200);
    const tasks = tasksRes.body.data?.tasks ?? tasksRes.body.data ?? [];
    const welcomeTask = tasks.find((t: any) => t.title === 'Welcome new customer');
    expect(welcomeTask).toBeDefined();

    // 6. Assert 'customer' tag was added to the deal.
    const dealAfter = await request(app)
      .get(`/api/v1/crm/deals/${dealId}`).set(auth(accessToken)).expect(200);
    expect(dealAfter.body.data.tags).toContain('customer');

    // 7. Assert executionCount bumped to 1 on the workflow.
    const wfListRes = await request(app)
      .get('/api/v1/crm/workflows').set(auth(accessToken)).expect(200);
    const wonChain = wfListRes.body.data.workflows.find((w: any) => w.name === 'Won chain');
    expect(wonChain.executionCount).toBe(1);
  });

  it('skips a step whose condition evaluates false but runs the rest', async () => {
    const { accessToken } = await setupTestAdmin(app, request);

    // Seed stages
    await request(app).post('/api/v1/crm/stages/seed').set(auth(accessToken));
    const stagesRes = await request(app)
      .get('/api/v1/crm/stages/list').set(auth(accessToken)).expect(200);
    const stageId = (stagesRes.body.data[0] ?? stagesRes.body.data.stages?.[0]).id;

    // Workflow: on deal_won, step1 (always) + step2 (only if deal.value > 100000)
    await request(app)
      .post('/api/v1/crm/workflows').set(auth(accessToken))
      .send({
        name: 'Conditional', trigger: 'deal_won', triggerConfig: {},
        steps: [
          { action: 'create_task', actionConfig: { taskTitle: 'Always fires' } },
          {
            action: 'create_task',
            actionConfig: { taskTitle: 'Only for whales' },
            condition: { field: 'deal.value', operator: 'gt', value: 100000 },
          },
        ],
      }).expect(200);

    // Small deal — should skip step 2
    const dealRes = await request(app)
      .post('/api/v1/crm/deals').set(auth(accessToken))
      .send({ title: 'Small', value: 5000, stageId })
      .expect((r: any) => { if (![200, 201].includes(r.status)) throw new Error(`create deal: ${r.status}`); });

    await request(app)
      .post(`/api/v1/crm/deals/${dealRes.body.data.id}/won`).set(auth(accessToken)).expect(200);

    await new Promise((r) => setTimeout(r, 200));

    const tasksRes = await request(app).get('/api/v1/work/tasks').set(auth(accessToken)).expect(200);
    const tasks = tasksRes.body.data?.tasks ?? tasksRes.body.data ?? [];
    expect(tasks.find((t: any) => t.title === 'Always fires')).toBeDefined();
    expect(tasks.find((t: any) => t.title === 'Only for whales')).toBeUndefined();
  });
});
