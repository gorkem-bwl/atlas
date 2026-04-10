import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api-client';

interface InvoicePreviewProps {
  invoiceId: string;
  onClose: () => void;
}

export function InvoicePreview({ invoiceId, onClose }: InvoicePreviewProps) {
  const { t } = useTranslation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url: string | null = null;
    async function loadPdf() {
      try {
        const response = await api.get(`/invoices/${invoiceId}/pdf?inline=true`, { responseType: 'blob' });
        url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        setPdfUrl(url);
      } catch (err) {
        console.error('Failed to load invoice PDF', err);
      } finally {
        setLoading(false);
      }
    }
    loadPdf();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [invoiceId]);

  const handleDownload = async () => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-secondary)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-primary)' }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onClose}>
          {t('common.back')}
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleDownload}>
          {t('invoices.downloadPdf')}
        </Button>
        <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => {
          if (pdfUrl) {
            const printWindow = window.open(pdfUrl);
            printWindow?.addEventListener('load', () => printWindow.print());
          }
        }}>
          {t('invoices.print')}
        </Button>
      </div>

      {/* PDF viewer */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skeleton width={600} height={800} />
        </div>
      ) : pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{ flex: 1, border: 'none' }}
          title={t('invoices.invoicePreview')}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
          {t('invoices.previewError')}
        </div>
      )}
    </div>
  );
}
