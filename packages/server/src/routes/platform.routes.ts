import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/platform.controller';

const router = Router();
router.use(authMiddleware);

// ─── Tenants ─────────────────────────────────────────────────────────
router.post('/tenants', ctrl.createTenant);
router.get('/tenants', ctrl.listMyTenants);
router.get('/tenants/:id', ctrl.getTenant);

// ─── Tenant Users ───────────────────────────────────────────────────
router.get('/tenants/:id/users', ctrl.listTenantUsers);
router.post('/tenants/:id/users', ctrl.createTenantUser);
router.delete('/tenants/:id/users/:userId', ctrl.removeTenantUser);
router.put('/tenants/:id/users/:userId/role', ctrl.updateTenantUserRole);
router.post('/tenants/:id/invitations', ctrl.inviteTenantUser);

export default router;
