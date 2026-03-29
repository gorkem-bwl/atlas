import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';

// ─── Inline Types ──────────────────────────────────────────────────

export interface CrmCompany {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  address: string | null;
  phone: string | null;
  tags: string[];
  isArchived: boolean;
  sortOrder: number;
  contactCount: number;
  dealCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrmContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  position: string | null;
  source: string | null;
  tags: string[];
  isArchived: boolean;
  sortOrder: number;
  companyName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmDealStage {
  id: string;
  accountId: string;
  name: string;
  color: string;
  probability: number;
  sequence: number;
  isDefault: boolean;
}

export interface CrmDeal {
  id: string;
  title: string;
  value: number;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  assignedUserId: string | null;
  probability: number;
  expectedCloseDate: string | null;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  tags: string[];
  isArchived: boolean;
  sortOrder: number;
  stageName: string | null;
  stageColor: string | null;
  contactName: string | null;
  companyName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: string;
  type: string;
  body: string;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrmDashboard {
  totalPipelineValue: number;
  dealsWonCount: number;
  dealsWonValue: number;
  dealsLostCount: number;
  winRate: number;
  averageDealSize: number;
  dealCount: number;
  valueByStage: { stageId: string; stageName: string | null; stageColor: string | null; value: number; count: number }[];
  recentActivities: CrmActivity[];
  dealsClosingSoon: CrmDeal[];
  topDeals: CrmDeal[];
}

export interface CrmDealCounts {
  stageId: string;
  stageName: string | null;
  stageColor: string | null;
  count: number;
  totalValue: number;
}

export interface CrmPipelineValue {
  totalValue: number;
  dealCount: number;
  weightedValue: number;
}

// ─── Company Queries ───────────────────────────────────────────────

export function useCompanies(filters?: { search?: string; industry?: string }) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: [...queryKeys.crm.companies.all, filterKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.industry) params.set('industry', filters.industry);
      const qs = params.toString();
      const { data } = await api.get(`/crm/companies/list${qs ? `?${qs}` : ''}`);
      return data.data as { companies: CrmCompany[] };
    },
    staleTime: 15_000,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crm.companies.detail(id!),
    queryFn: async () => {
      const { data } = await api.get(`/crm/companies/${id}`);
      return data.data as CrmCompany;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; domain?: string | null; industry?: string | null; size?: string | null; address?: string | null; phone?: string | null; tags?: string[] }) => {
      const { data } = await api.post('/crm/companies', input);
      return data.data as CrmCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<{ name: string; domain: string | null; industry: string | null; size: string | null; address: string | null; phone: string | null; tags: string[]; sortOrder: number; isArchived: boolean }>) => {
      const { data } = await api.patch(`/crm/companies/${id}`, input);
      return data.data as CrmCompany;
    },
    onSuccess: (company) => {
      queryClient.setQueryData(queryKeys.crm.companies.detail(company.id), company);
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

// ─── Contact Queries ───────────────────────────────────────────────

export function useContacts(filters?: { search?: string; companyId?: string }) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: [...queryKeys.crm.contacts.all, filterKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.companyId) params.set('companyId', filters.companyId);
      const qs = params.toString();
      const { data } = await api.get(`/crm/contacts/list${qs ? `?${qs}` : ''}`);
      return data.data as { contacts: CrmContact[] };
    },
    staleTime: 15_000,
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crm.contacts.detail(id!),
    queryFn: async () => {
      const { data } = await api.get(`/crm/contacts/${id}`);
      return data.data as CrmContact;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email?: string | null; phone?: string | null; companyId?: string | null; position?: string | null; source?: string | null; tags?: string[] }) => {
      const { data } = await api.post('/crm/contacts', input);
      return data.data as CrmContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<{ name: string; email: string | null; phone: string | null; companyId: string | null; position: string | null; source: string | null; tags: string[]; sortOrder: number; isArchived: boolean }>) => {
      const { data } = await api.patch(`/crm/contacts/${id}`, input);
      return data.data as CrmContact;
    },
    onSuccess: (contact) => {
      queryClient.setQueryData(queryKeys.crm.contacts.detail(contact.id), contact);
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

// ─── Stage Queries ─────────────────────────────────────────────────

export function useStages() {
  return useQuery({
    queryKey: queryKeys.crm.stages,
    queryFn: async () => {
      const { data } = await api.get('/crm/stages/list');
      return data.data as { stages: CrmDealStage[] };
    },
    staleTime: 30_000,
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string; probability?: number; sequence?: number; isDefault?: boolean }) => {
      const { data } = await api.post('/crm/stages', input);
      return data.data as CrmDealStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<{ name: string; color: string; probability: number; sequence: number; isDefault: boolean }>) => {
      const { data } = await api.patch(`/crm/stages/${id}`, input);
      return data.data as CrmDealStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useSeedStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/crm/stages/seed');
      return data.data as { stages: CrmDealStage[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useReorderStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stageIds: string[]) => {
      const { data } = await api.post('/crm/stages/reorder', { stageIds });
      return data.data as { stages: CrmDealStage[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

// ─── Deal Queries ──────────────────────────────────────────────────

export function useDeals(filters?: { stageId?: string; contactId?: string; companyId?: string }) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: [...queryKeys.crm.deals.all, filterKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.stageId) params.set('stageId', filters.stageId);
      if (filters?.contactId) params.set('contactId', filters.contactId);
      if (filters?.companyId) params.set('companyId', filters.companyId);
      const qs = params.toString();
      const { data } = await api.get(`/crm/deals/list${qs ? `?${qs}` : ''}`);
      return data.data as { deals: CrmDeal[] };
    },
    staleTime: 15_000,
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crm.deals.detail(id!),
    queryFn: async () => {
      const { data } = await api.get(`/crm/deals/${id}`);
      return data.data as CrmDeal;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; value: number; stageId: string; contactId?: string | null; companyId?: string | null; assignedUserId?: string | null; probability?: number; expectedCloseDate?: string | null; tags?: string[] }) => {
      const { data } = await api.post('/crm/deals', input);
      return data.data as CrmDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<{ title: string; value: number; stageId: string; contactId: string | null; companyId: string | null; assignedUserId: string | null; probability: number; expectedCloseDate: string | null; tags: string[]; sortOrder: number; isArchived: boolean }>) => {
      const { data } = await api.patch(`/crm/deals/${id}`, input);
      return data.data as CrmDeal;
    },
    onSuccess: (deal) => {
      queryClient.setQueryData(queryKeys.crm.deals.detail(deal.id), deal);
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useMarkDealWon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/crm/deals/${id}/won`);
      return data.data as CrmDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useMarkDealLost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post(`/crm/deals/${id}/lost`, { reason });
      return data.data as CrmDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useDealCounts() {
  return useQuery({
    queryKey: queryKeys.crm.deals.counts,
    queryFn: async () => {
      const { data } = await api.get('/crm/deals/counts-by-stage');
      return data.data as CrmDealCounts[];
    },
    staleTime: 15_000,
  });
}

export function usePipelineValue() {
  return useQuery({
    queryKey: queryKeys.crm.deals.pipeline,
    queryFn: async () => {
      const { data } = await api.get('/crm/deals/pipeline-value');
      return data.data as CrmPipelineValue;
    },
    staleTime: 15_000,
  });
}

// ─── Activity Queries ──────────────────────────────────────────────

export function useActivities(filters?: { dealId?: string; contactId?: string; companyId?: string }) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: [...queryKeys.crm.activities.all, filterKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.dealId) params.set('dealId', filters.dealId);
      if (filters?.contactId) params.set('contactId', filters.contactId);
      if (filters?.companyId) params.set('companyId', filters.companyId);
      const qs = params.toString();
      const { data } = await api.get(`/crm/activities/list${qs ? `?${qs}` : ''}`);
      return data.data as { activities: CrmActivity[] };
    },
    staleTime: 15_000,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: string; body: string; dealId?: string | null; contactId?: string | null; companyId?: string | null; scheduledAt?: string | null }) => {
      const { data } = await api.post('/crm/activities', input);
      return data.data as CrmActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<{ type: string; body: string; dealId: string | null; contactId: string | null; companyId: string | null; scheduledAt: string | null; completedAt: string | null; isArchived: boolean }>) => {
      const { data } = await api.patch(`/crm/activities/${id}`, input);
      return data.data as CrmActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

// ─── Dashboard ────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.dashboard,
    queryFn: async () => {
      const { data } = await api.get('/crm/dashboard');
      return data.data as CrmDashboard;
    },
    staleTime: 15_000,
  });
}

// ─── Workflow Types ───────────────────────────────────────────────

export interface CrmWorkflow {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  action: string;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Workflow Queries ─────────────────────────────────────────────

export function useWorkflows() {
  return useQuery({
    queryKey: queryKeys.crm.workflows.all,
    queryFn: async () => {
      const { data } = await api.get('/crm/workflows');
      return data.data as { workflows: CrmWorkflow[] };
    },
    staleTime: 15_000,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; trigger: string; triggerConfig?: Record<string, unknown>; action: string; actionConfig: Record<string, unknown> }) => {
      const { data } = await api.post('/crm/workflows', input);
      return data.data as CrmWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.workflows.all });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<{ name: string; trigger: string; triggerConfig: Record<string, unknown>; action: string; actionConfig: Record<string, unknown>; isActive: boolean }>) => {
      const { data } = await api.put(`/crm/workflows/${id}`, input);
      return data.data as CrmWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.workflows.all });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.workflows.all });
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/crm/workflows/${id}/toggle`);
      return data.data as CrmWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.workflows.all });
    },
  });
}

// ─── Permission Types ────────────────────────────────────────────

export type CrmRole = 'admin' | 'manager' | 'sales' | 'viewer';
export type CrmRecordAccess = 'all' | 'own';
export type CrmEntity = 'deals' | 'contacts' | 'companies' | 'activities' | 'workflows' | 'dashboard';
export type CrmOperation = 'view' | 'create' | 'update' | 'delete';

export interface CrmPermissionWithUser {
  id: string | null;
  accountId: string;
  userId: string;
  role: CrmRole;
  recordAccess: CrmRecordAccess;
  userName: string | null;
  userEmail: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyCrmPermission {
  id: string | null;
  accountId: string;
  userId: string;
  role: CrmRole;
  recordAccess: CrmRecordAccess;
}

// Client-side permission matrix (mirrors the server)
const ROLE_MATRIX: Record<CrmRole, Record<CrmEntity, Set<CrmOperation>>> = {
  admin: {
    deals: new Set(['view', 'create', 'update', 'delete']),
    contacts: new Set(['view', 'create', 'update', 'delete']),
    companies: new Set(['view', 'create', 'update', 'delete']),
    activities: new Set(['view', 'create', 'update', 'delete']),
    workflows: new Set(['view', 'create', 'update', 'delete']),
    dashboard: new Set(['view']),
  },
  manager: {
    deals: new Set(['view', 'create', 'update', 'delete']),
    contacts: new Set(['view', 'create', 'update', 'delete']),
    companies: new Set(['view', 'create', 'update', 'delete']),
    activities: new Set(['view', 'create', 'update', 'delete']),
    workflows: new Set(['view']),
    dashboard: new Set(['view']),
  },
  sales: {
    deals: new Set(['view', 'create', 'update', 'delete']),
    contacts: new Set(['view', 'create', 'update', 'delete']),
    companies: new Set(['view']),
    activities: new Set(['view', 'create', 'update', 'delete']),
    workflows: new Set<CrmOperation>(),
    dashboard: new Set(['view']),
  },
  viewer: {
    deals: new Set(['view']),
    contacts: new Set(['view']),
    companies: new Set(['view']),
    activities: new Set(['view']),
    workflows: new Set<CrmOperation>(),
    dashboard: new Set(['view']),
  },
};

export function canAccess(role: CrmRole, entity: CrmEntity, operation: CrmOperation): boolean {
  return ROLE_MATRIX[role]?.[entity]?.has(operation) ?? false;
}

// ─── Permission Queries ─────────────────────────────────────────

export function useCrmPermissions() {
  return useQuery({
    queryKey: queryKeys.crm.permissions.all,
    queryFn: async () => {
      const { data } = await api.get('/crm/permissions');
      return data.data as { permissions: CrmPermissionWithUser[] };
    },
    staleTime: 30_000,
  });
}

export function useMyCrmPermission() {
  return useQuery({
    queryKey: queryKeys.crm.permissions.me,
    queryFn: async () => {
      const { data } = await api.get('/crm/permissions/me');
      return data.data as MyCrmPermission;
    },
    staleTime: 30_000,
  });
}

export function useUpdateCrmPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role, recordAccess }: { userId: string; role: CrmRole; recordAccess: CrmRecordAccess }) => {
      const { data } = await api.put(`/crm/permissions/${userId}`, { role, recordAccess });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.permissions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.permissions.me });
    },
  });
}

// ─── Seed ──────────────────────────────────────────────────────────

export function useSeedCrmData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/crm/seed');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}
