import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../../lib/format';
import {
  Users, X, Trash2, Mail, Phone, MapPin, Copy, ExternalLink,
} from 'lucide-react';
import {
  useDeleteClient, useProjects, useInvoices,
  type ProjectClient,
  getInvoiceStatusVariant,
} from '../../hooks';
import { IconButton } from '../../../../components/ui/icon-button';
import { Badge } from '../../../../components/ui/badge';
import { StatusDot } from '../../../../components/ui/status-dot';
import { SmartButtonBar } from '../../../../components/shared/SmartButtonBar';
import { CustomFieldsRenderer } from '../../../../components/shared/custom-fields-renderer';
import type { ActiveView } from '../../lib/types';

export function ClientDetailPanel({ client, onClose, onNavigate }: { client: ProjectClient; onClose: () => void; onNavigate?: (view: ActiveView, selectId?: string) => void }) {
  const { t } = useTranslation();
  const deleteClient = useDeleteClient();
  const { data: projectsData } = useProjects({ clientId: client.id });
  const clientProjects = projectsData?.projects ?? [];
  const { data: invoicesData } = useInvoices({ clientId: client.id });
  const clientInvoices = (invoicesData?.invoices ?? []).slice(0, 5);
  const [copied, setCopied] = useState(false);

  const portalUrl = client.portalToken
    ? `${window.location.origin}/projects/portal/${client.portalToken}`
    : null;

  const handleCopyPortalLink = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compute invoice summary
  const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const overdueAmount = clientInvoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="projects-detail-panel">
      <div style={{ padding: '12px var(--spacing-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0 }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-family)' }}>
          {t('projects.clients.clientDetail')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon={<Trash2 size={14} />} label={t('projects.actions.delete')} size={28} destructive onClick={() => { deleteClient.mutate(client.id); onClose(); }} />
          <IconButton icon={<X size={14} />} label={t('common.close')} size={28} onClick={onClose} />
        </div>
      </div>
      <SmartButtonBar appId="projects" recordId={client.id} />
      <div className="projects-detail-body">
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
          {client.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Contact info */}
          {client.email && (
            <div className="projects-detail-field">
              <span className="projects-detail-field-label">{t('projects.clients.email')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <Mail size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {client.email}
              </div>
            </div>
          )}
          {client.phone && (
            <div className="projects-detail-field">
              <span className="projects-detail-field-label">{t('projects.clients.phone')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <Phone size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {client.phone}
              </div>
            </div>
          )}
          {client.address && (
            <div className="projects-detail-field">
              <span className="projects-detail-field-label">{t('projects.clients.address')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <MapPin size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {client.address}
              </div>
            </div>
          )}

          {/* Portal link */}
          {portalUrl && (
            <div className="projects-detail-field">
              <span className="projects-detail-field-label">{t('projects.portal.clientPortal')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <div style={{ flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--color-bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                  {portalUrl}
                </div>
                <IconButton
                  icon={copied ? <ExternalLink size={13} /> : <Copy size={13} />}
                  label={copied ? t('projects.dashboard.copied') : t('projects.dashboard.copyLink')}
                  size={24}
                  onClick={handleCopyPortalLink}
                />
              </div>
            </div>
          )}

          {/* Invoice summary */}
          <div className="projects-detail-field">
            <span className="projects-detail-field-label">{t('projects.dashboard.invoiceSummary')}</span>
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}>
              <div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>{t('projects.dashboard.totalBilled')}</div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>{formatCurrency(client.totalBilled)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>{t('projects.reports.outstanding')}</div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', color: client.outstandingAmount > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>{formatCurrency(client.outstandingAmount)}</div>
              </div>
              {overdueAmount > 0 && (
                <div>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>{t('projects.dashboard.overdue')}</div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>{formatCurrency(overdueAmount)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="projects-detail-field">
            <span className="projects-detail-field-label">{t('projects.clients.linkedProjects')} ({clientProjects.length})</span>
            {clientProjects.length === 0 ? (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                {t('projects.clients.noProjects')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'var(--spacing-xs)' }}>
                {clientProjects.map((proj) => (
                  <div
                    key={proj.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--color-border-secondary)', cursor: onNavigate ? 'pointer' : undefined }}
                    onClick={() => onNavigate?.('projects', proj.id)}
                  >
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                      <StatusDot color={proj.color} size={6} />
                      {proj.name}
                    </span>
                    <Badge variant={proj.status === 'active' ? 'success' : proj.status === 'paused' ? 'warning' : proj.status === 'completed' ? 'primary' : 'default'}>
                      {t(`projects.status.${proj.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <CustomFieldsRenderer appId="projects" recordType="clients" recordId={client.id} />

          {/* Recent invoices */}
          <div className="projects-detail-field">
            <span className="projects-detail-field-label">{t('projects.clients.linkedInvoices')} ({clientInvoices.length})</span>
            {clientInvoices.length === 0 ? (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                {t('projects.clients.noInvoices')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'var(--spacing-xs)' }}>
                {clientInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--color-border-secondary)', cursor: onNavigate ? 'pointer' : undefined }}
                    onClick={() => onNavigate?.('invoices', inv.id)}
                  >
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                      {inv.invoiceNumber}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
                        {formatCurrency(inv.total)}
                      </span>
                      <Badge variant={getInvoiceStatusVariant(inv.status)}>
                        {t(`projects.status.${inv.status}`)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
