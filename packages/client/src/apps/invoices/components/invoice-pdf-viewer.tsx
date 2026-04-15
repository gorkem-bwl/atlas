import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api-client';
import { useDebounce } from '../../../hooks/use-debounce';

const PDF_REFRESH_DEBOUNCE_MS = 1500;

interface Props {
  invoiceId: string;
  /** Current `updatedAt` from the TanStack Query cache. Drives re-fetch. */
  updatedAt?: string;
}

export function InvoicePdfViewer({ invoiceId, updatedAt }: Props) {
  const { t } = useTranslation();
  const debouncedUpdatedAt = useDebounce(updatedAt, PDF_REFRESH_DEBOUNCE_MS);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    async function load() {
      try {
        const response = await api.get(`/invoices/${invoiceId}/pdf?inline=true`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [invoiceId, debouncedUpdatedAt]);

  useEffect(() => () => {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
  }, []);

  if (loading && !pdfUrl) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
        <Skeleton style={{ width: '80%', height: '80%' }} />
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-xl)', color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
      }}>
        {t('invoices.detail.pdfLoadFailed')}
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      title={t('invoices.detail.pdfIframeTitle')}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none', background: 'var(--color-bg-tertiary)' }}
    />
  );
}
