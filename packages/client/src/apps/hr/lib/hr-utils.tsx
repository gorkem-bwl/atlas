import { Badge } from '../../../components/ui/badge';
import type { HrEmployee, HrTimeOff } from '../hooks';

export function getStatusBadge(status: HrEmployee['status'], t: (k: string) => string) {
  switch (status) {
    case 'active':
      return <Badge variant="success">{t('hr.status.active')}</Badge>;
    case 'on-leave':
      return <Badge variant="warning">{t('hr.status.onLeave')}</Badge>;
    case 'terminated':
      return <Badge variant="error">{t('hr.status.terminated')}</Badge>;
  }
}

export function getTimeOffTypeBadge(type: HrTimeOff['type'], t: (k: string) => string) {
  switch (type) {
    case 'vacation':
      return <Badge variant="primary">{t('hr.leaveType.vacation')}</Badge>;
    case 'sick':
      return <Badge variant="warning">{t('hr.leaveType.sick')}</Badge>;
    case 'personal':
      return <Badge variant="default">{t('hr.leaveType.personal')}</Badge>;
  }
}

export function getTimeOffStatusBadge(status: HrTimeOff['status'], t: (k: string) => string) {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">{t('hr.timeOffStatus.pending')}</Badge>;
    case 'approved':
      return <Badge variant="success">{t('hr.timeOffStatus.approved')}</Badge>;
    case 'rejected':
      return <Badge variant="error">{t('hr.timeOffStatus.rejected')}</Badge>;
  }
}

export function getCategoryBadge(category: string) {
  const variants: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'default'> = {
    IT: 'primary', HR: 'success', Team: 'warning', Admin: 'error',
  };
  return <Badge variant={variants[category] || 'default'}>{category}</Badge>;
}

export function getDocTypeBadge(type: string) {
  const variants: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'default'> = {
    contract: 'primary', certificate: 'success', ID: 'warning', resume: 'default', 'policy-acknowledgment': 'error',
  };
  return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
}

// --- Color Presets -------------------------------------------------------

export const DEPARTMENT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];
