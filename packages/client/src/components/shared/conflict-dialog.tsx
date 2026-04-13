import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  CONFLICT_CANCELLED,
  CONFLICT_REFRESHED,
  IF_UNMODIFIED_SINCE_HEADER,
} from '@atlas-platform/shared';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { useConflictStore } from '../../stores/conflict-store';
import { api } from '../../lib/api-client';

/**
 * Global dialog that prompts the user when a 409 STALE_RESOURCE conflict is
 * detected by the axios interceptor. Offers three paths:
 *   - Refresh: reject the pending promise and invalidate the app's queries
 *   - Override: retry with If-Unmodified-Since set to the server's current
 *     updatedAt, forcing the save
 *   - Cancel: close the dialog and reject the pending promise
 */
export function ConflictDialog() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const open = useConflictStore((s) => s.open);
  const pending = useConflictStore((s) => s.pending);
  const close = useConflictStore((s) => s.close);

  const handleCancel = () => {
    if (pending) {
      pending.reject({ code: CONFLICT_CANCELLED });
    }
    close();
  };

  const handleRefresh = () => {
    if (pending) {
      pending.reject({ code: CONFLICT_REFRESHED });
      // Scope invalidation to the app that conflicted (derived from URL
      // like /crm/deals/:id → 'crm'). Fall back to broad invalidation
      // when the prefix isn't recognisable.
      const appKey = extractAppKey(pending.request.url);
      if (appKey) {
        queryClient.invalidateQueries({ queryKey: [appKey] });
      } else {
        queryClient.invalidateQueries();
      }
    }
    close();
  };

  const handleOverride = async () => {
    if (!pending) {
      close();
      return;
    }
    const { request, currentUpdatedAt, resolve, reject } = pending;
    try {
      const retryRequest = {
        ...request,
        headers: {
          ...(request.headers ?? {}),
          [IF_UNMODIFIED_SINCE_HEADER]: currentUpdatedAt,
        },
      };
      const response = await api(retryRequest);
      resolve(response);
    } catch (err) {
      reject(err);
    } finally {
      close();
    }
  };

  const onOpenChange = (next: boolean) => {
    if (!next) handleCancel();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={480}>
      <Modal.Header title={t('common.conflict.title', 'Conflicting changes')} />
      <Modal.Body>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {t(
            'common.conflict.description',
            'This record was modified by someone else while you were editing. Your changes are based on an older version.',
          )}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={handleRefresh}>
          {t('common.conflict.refresh', 'Refresh')}
        </Button>
        <Button variant="secondary" onClick={handleCancel}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="danger" onClick={handleOverride}>
          {t('common.conflict.override', 'Override')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function extractAppKey(url: string | undefined): string | null {
  if (!url) return null;
  // URLs look like '/crm/deals/123' or 'crm/deals/123' (with/without leading slash)
  const match = url.replace(/^\/+/, '').split('/')[0];
  const knownApps = new Set(['crm', 'projects', 'invoices', 'tasks', 'hr', 'sign', 'docs', 'drawings', 'drive']);
  return knownApps.has(match) ? match : null;
}
