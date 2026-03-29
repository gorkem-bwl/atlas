import { useState } from 'react';
import { Merge } from 'lucide-react';
import { useMergeContacts, useMergeCompanies, type CrmContact, type CrmCompany } from '../hooks';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

// ─── Merge contacts modal ───────────────────────────────────────

export function MergeContactsModal({
  open, onClose, contactA, contactB,
}: {
  open: boolean;
  onClose: () => void;
  contactA: CrmContact | null;
  contactB: CrmContact | null;
}) {
  const mergeContacts = useMergeContacts();
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  if (!contactA || !contactB) return null;

  const primary = primaryId === contactB.id ? contactB : contactA;
  const secondary = primaryId === contactB.id ? contactA : contactB;

  const handleMerge = () => {
    mergeContacts.mutate({ primaryId: primary.id, secondaryId: secondary.id }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Header title="Merge contacts" />
      <Modal.Body>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
          Choose which contact to keep as the primary record. Data from the secondary contact will be merged in.
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          {[contactA, contactB].map((contact) => (
            <div
              key={contact.id}
              onClick={() => setPrimaryId(contact.id)}
              style={{
                flex: 1,
                padding: 'var(--spacing-md)',
                border: `2px solid ${(primaryId ?? contactA.id) === contact.id ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                  {contact.name}
                </span>
                {(primaryId ?? contactA.id) === contact.id && <Badge variant="success">Primary</Badge>}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                {contact.email || 'No email'}<br />
                {contact.phone || 'No phone'}<br />
                {contact.companyName || 'No company'}
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} size="md">Cancel</Button>
        <Button variant="primary" onClick={handleMerge} size="md" disabled={mergeContacts.isPending}>
          <Merge size={14} style={{ marginRight: 4 }} />
          {mergeContacts.isPending ? 'Merging...' : 'Merge contacts'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Merge companies modal ──────────────────────────────────────

export function MergeCompaniesModal({
  open, onClose, companyA, companyB,
}: {
  open: boolean;
  onClose: () => void;
  companyA: CrmCompany | null;
  companyB: CrmCompany | null;
}) {
  const mergeCompanies = useMergeCompanies();
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  if (!companyA || !companyB) return null;

  const primary = primaryId === companyB.id ? companyB : companyA;
  const secondary = primaryId === companyB.id ? companyA : companyB;

  const handleMerge = () => {
    mergeCompanies.mutate({ primaryId: primary.id, secondaryId: secondary.id }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Header title="Merge companies" />
      <Modal.Body>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
          Choose which company to keep as the primary record. Data from the secondary company will be merged in.
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          {[companyA, companyB].map((company) => (
            <div
              key={company.id}
              onClick={() => setPrimaryId(company.id)}
              style={{
                flex: 1,
                padding: 'var(--spacing-md)',
                border: `2px solid ${(primaryId ?? companyA.id) === company.id ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                  {company.name}
                </span>
                {(primaryId ?? companyA.id) === company.id && <Badge variant="success">Primary</Badge>}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                {company.domain || 'No domain'}<br />
                {company.industry || 'No industry'}<br />
                {company.phone || 'No phone'}
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} size="md">Cancel</Button>
        <Button variant="primary" onClick={handleMerge} size="md" disabled={mergeCompanies.isPending}>
          <Merge size={14} style={{ marginRight: 4 }} />
          {mergeCompanies.isPending ? 'Merging...' : 'Merge companies'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
