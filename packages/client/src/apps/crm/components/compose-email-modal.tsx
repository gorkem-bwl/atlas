import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { useSendEmail } from '../hooks';

interface ComposeEmailModalProps {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  contactId?: string;
  dealId?: string;
}

export function ComposeEmailModal({ open, onClose, defaultTo, contactId, dealId }: ComposeEmailModalProps) {
  const { t } = useTranslation();
  const [to, setTo] = useState(defaultTo ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const sendEmail = useSendEmail();

  const handleSend = () => {
    if (!to.trim()) {
      setError(t('crm.emails.recipientRequired'));
      return;
    }
    if (!subject.trim()) {
      setError(t('crm.emails.subjectRequired'));
      return;
    }
    setError('');
    sendEmail.mutate(
      { to: to.trim(), subject: subject.trim(), body: body.trim(), contactId, dealId },
      {
        onSuccess: () => {
          setTo(defaultTo ?? '');
          setSubject('');
          setBody('');
          setError('');
          onClose();
        },
        onError: () => {
          setError(t('crm.emails.sendFailed'));
        },
      },
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError('');
      onClose();
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange} width={520}>
      <Modal.Header title={t('crm.emails.compose')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input
            label={t('crm.emails.to')}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t('crm.emails.recipientPlaceholder')}
            size="sm"
          />
          <Input
            label={t('crm.emails.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('crm.emails.subjectPlaceholder')}
            size="sm"
          />
          <Textarea
            label={t('crm.emails.message')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('crm.emails.messagePlaceholder')}
            rows={6}
          />
          {error && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', fontFamily: 'var(--font-family)' }}>
              {error}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSend} disabled={sendEmail.isPending}>
          {sendEmail.isPending ? t('crm.emails.sending') : t('crm.emails.send')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
