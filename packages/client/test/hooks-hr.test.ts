import { describe, it, expect } from 'vitest';

import {
  useEmployeeList,
  useEmployee,
  useEmployeeCounts,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useDepartmentList,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useTimeOffList,
  useCreateTimeOff,
  useUpdateTimeOff,
  useDeleteTimeOff,
  useHrDashboard,
  useLeaveBalances,
  useAllocateLeave,
  useOnboardingTasks,
  useCreateOnboardingTask,
  useUpdateOnboardingTask,
  useDeleteOnboardingTask,
  useApplyOnboardingTemplate,
  useOnboardingTemplates,
  useEmployeeDocuments,
  useUploadEmployeeDocument,
  useDeleteEmployeeDocument,
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useLeavePolicies,
  useCreateLeavePolicy,
  useUpdateLeavePolicy,
  useAssignPolicy,
  useEmployeePolicy,
  useHolidayCalendars,
  useCreateHolidayCalendar,
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useLeaveApplications,
  useCreateLeaveApplication,
  useSubmitLeaveApplication,
  useApproveLeaveApplication,
  useRejectLeaveApplication,
  useCancelLeaveApplication,
  useLeaveCalendar,
  usePendingApprovals,
  useAttendanceList,
  useMarkAttendance,
  useBulkMarkAttendance,
  useAttendanceToday,
  useAttendanceReport,
  useLifecycleTimeline,
  useCreateLifecycleEvent,
  useSeedHrData,
} from '../src/apps/hr/hooks';

describe('HR hooks', () => {
  // ─── Employee hooks ─────────────────────────────────────────────

  describe('employee hook exports', () => {
    it('exports employee query hooks', () => {
      expect(typeof useEmployeeList).toBe('function');
      expect(typeof useEmployee).toBe('function');
      expect(typeof useEmployeeCounts).toBe('function');
    });

    it('exports employee mutation hooks', () => {
      expect(typeof useCreateEmployee).toBe('function');
      expect(typeof useUpdateEmployee).toBe('function');
      expect(typeof useDeleteEmployee).toBe('function');
    });
  });

  // ─── Department hooks ───────────────────────────────────────────

  describe('department hook exports', () => {
    it('exports department query and mutation hooks', () => {
      expect(typeof useDepartmentList).toBe('function');
      expect(typeof useCreateDepartment).toBe('function');
      expect(typeof useUpdateDepartment).toBe('function');
      expect(typeof useDeleteDepartment).toBe('function');
    });
  });

  // ─── Time off hooks ─────────────────────────────────────────────

  describe('time off hook exports', () => {
    it('exports time off query and mutation hooks', () => {
      expect(typeof useTimeOffList).toBe('function');
      expect(typeof useCreateTimeOff).toBe('function');
      expect(typeof useUpdateTimeOff).toBe('function');
      expect(typeof useDeleteTimeOff).toBe('function');
    });
  });

  // ─── Leave types and policies ───────────────────────────────────

  describe('leave type and policy hook exports', () => {
    it('exports leave type hooks', () => {
      expect(typeof useLeaveTypes).toBe('function');
      expect(typeof useCreateLeaveType).toBe('function');
      expect(typeof useUpdateLeaveType).toBe('function');
      expect(typeof useDeleteLeaveType).toBe('function');
    });

    it('exports leave policy hooks', () => {
      expect(typeof useLeavePolicies).toBe('function');
      expect(typeof useCreateLeavePolicy).toBe('function');
      expect(typeof useUpdateLeavePolicy).toBe('function');
      expect(typeof useAssignPolicy).toBe('function');
      expect(typeof useEmployeePolicy).toBe('function');
    });
  });

  // ─── Leave applications ─────────────────────────────────────────

  describe('leave application hook exports', () => {
    it('exports leave application CRUD hooks', () => {
      expect(typeof useLeaveApplications).toBe('function');
      expect(typeof useCreateLeaveApplication).toBe('function');
    });

    it('exports leave application workflow hooks', () => {
      expect(typeof useSubmitLeaveApplication).toBe('function');
      expect(typeof useApproveLeaveApplication).toBe('function');
      expect(typeof useRejectLeaveApplication).toBe('function');
      expect(typeof useCancelLeaveApplication).toBe('function');
    });

    it('exports leave calendar and pending approvals hooks', () => {
      expect(typeof useLeaveCalendar).toBe('function');
      expect(typeof usePendingApprovals).toBe('function');
    });
  });

  // ─── Attendance hooks ───────────────────────────────────────────

  describe('attendance hook exports', () => {
    it('exports attendance query and mutation hooks', () => {
      expect(typeof useAttendanceList).toBe('function');
      expect(typeof useMarkAttendance).toBe('function');
      expect(typeof useBulkMarkAttendance).toBe('function');
      expect(typeof useAttendanceToday).toBe('function');
      expect(typeof useAttendanceReport).toBe('function');
    });
  });

  // ─── Other hooks ────────────────────────────────────────────────

  describe('other hook exports', () => {
    it('exports dashboard hook', () => {
      expect(typeof useHrDashboard).toBe('function');
    });

    it('exports leave balance hooks', () => {
      expect(typeof useLeaveBalances).toBe('function');
      expect(typeof useAllocateLeave).toBe('function');
    });

    it('exports onboarding hooks', () => {
      expect(typeof useOnboardingTasks).toBe('function');
      expect(typeof useCreateOnboardingTask).toBe('function');
      expect(typeof useUpdateOnboardingTask).toBe('function');
      expect(typeof useDeleteOnboardingTask).toBe('function');
      expect(typeof useApplyOnboardingTemplate).toBe('function');
      expect(typeof useOnboardingTemplates).toBe('function');
    });

    it('exports employee document hooks', () => {
      expect(typeof useEmployeeDocuments).toBe('function');
      expect(typeof useUploadEmployeeDocument).toBe('function');
      expect(typeof useDeleteEmployeeDocument).toBe('function');
    });

    it('exports holiday calendar hooks', () => {
      expect(typeof useHolidayCalendars).toBe('function');
      expect(typeof useCreateHolidayCalendar).toBe('function');
      expect(typeof useHolidays).toBe('function');
      expect(typeof useCreateHoliday).toBe('function');
      expect(typeof useDeleteHoliday).toBe('function');
    });

    it('exports lifecycle and seed hooks', () => {
      expect(typeof useLifecycleTimeline).toBe('function');
      expect(typeof useCreateLifecycleEvent).toBe('function');
      expect(typeof useSeedHrData).toBe('function');
    });
  });

  // ─── Module structure ───────────────────────────────────────────

  describe('module structure', () => {
    it('exports a large number of hooks', async () => {
      const mod = await import('../src/apps/hr/hooks');
      const exportedFns = Object.values(mod).filter((v) => typeof v === 'function');
      expect(exportedFns.length).toBeGreaterThanOrEqual(40);
    });
  });
});
