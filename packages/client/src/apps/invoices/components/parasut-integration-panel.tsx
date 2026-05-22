import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useParasutConnection,
  useSaveParasutConnection,
  useTestParasutConnection,
  useDeleteParasutConnection,
} from '../hooks';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { QueryErrorState } from '../../../components/ui/query-error-state';
import { useToastStore } from '../../../stores/toast-store';

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
};

const sectionBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-lg)',
  padding: 'var(--spacing-lg)',
  background: 'var(--color-bg-secondary)',
  borderRadius: 'var(--radius-md)',
};

const infoTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.5,
  fontFamily: 'var(--font-family)',
};

export function ParasutIntegrationPanel() {
  const { t } = useTranslation();
  const { data: connection, isLoading, isError, refetch } = useParasutConnection();
  const saveConnection = useSaveParasutConnection();
  const testConnection = useTestParasutConnection();
  const deleteConnection = useDeleteParasutConnection();
  const addToast = useToastStore((s) => s.addToast);

  // Secret fields are never returned by the API, so the form always starts
  // blank for them. Non-secret email / company id are prefilled from status.
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    if (connection) {
      setEmail(connection.email ?? '');
      setCompanyId(connection.companyId ?? '');
    }
  }, [connection]);

  if (isError) return <QueryErrorState onRetry={() => refetch()} />;
  if (isLoading) return <></>;

  const status = connection?.status ?? 'disconnected';
  const statusVariant =
    status === 'connected' ? 'success' : status === 'error' ? 'error' : 'default';
  const statusLabel =
    status === 'connected'
      ? t('invoices.parasut.statusConnected')
      : status === 'error'
        ? t('invoices.parasut.statusError')
        : t('invoices.parasut.statusDisconnected');

  const canSave =
    clientId.trim() &&
    clientSecret &&
    email.trim() &&
    password &&
    companyId.trim();

  const handleSave = () => {
    saveConnection.mutate(
      {
        clientId: clientId.trim(),
        clientSecret,
        email: email.trim(),
        password,
        companyId: companyId.trim(),
      },
      {
        onSuccess: () => {
          setClientSecret('');
          setPassword('');
          addToast({ type: 'success', message: t('invoices.parasut.saved') });
        },
        onError: () => addToast({ type: 'error', message: t('common.error') }),
      },
    );
  };

  const handleTest = () => {
    testConnection.mutate(undefined, {
      onSuccess: (result) => {
        if (result.connected) {
          addToast({ type: 'success', message: t('invoices.parasut.testSuccess') });
        } else {
          addToast({ type: 'error', message: result.lastError || t('invoices.parasut.testFailed') });
        }
      },
      onError: () => addToast({ type: 'error', message: t('invoices.parasut.testFailed') }),
    });
  };

  const handleDisconnect = () => {
    deleteConnection.mutate(undefined, {
      onSuccess: () => {
        setClientId('');
        setClientSecret('');
        setEmail('');
        setPassword('');
        setCompanyId('');
        addToast({ type: 'success', message: t('invoices.parasut.disconnected') });
      },
      onError: () => addToast({ type: 'error', message: t('common.error') }),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', maxWidth: 480 }}>
      <div style={sectionBoxStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
          <span style={sectionLabelStyle}>{t('invoices.parasut.title')}</span>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <div style={infoTextStyle}>{t('invoices.parasut.description')}</div>

        {connection?.connected && connection.companyId && (
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
            {t('invoices.parasut.connectedAs', { email: connection.email ?? '', companyId: connection.companyId })}
          </div>
        )}
        {status === 'error' && connection?.lastError && (
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', lineHeight: 1.5, fontFamily: 'var(--font-family)' }}>
            {connection.lastError}
          </div>
        )}
      </div>

      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.parasut.credentials')}</span>

        <Input
          label={t('invoices.parasut.clientId')}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          autoComplete="off"
          size="sm"
        />
        <Input
          label={t('invoices.parasut.clientSecret')}
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder={connection?.connected ? '••••••••' : undefined}
          autoComplete="new-password"
          size="sm"
        />
        <Input
          label={t('invoices.parasut.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          size="sm"
        />
        <Input
          label={t('invoices.parasut.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={connection?.connected ? '••••••••' : undefined}
          autoComplete="new-password"
          size="sm"
        />
        <Input
          label={t('invoices.parasut.companyId')}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          autoComplete="off"
          size="sm"
        />

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!canSave || saveConnection.isPending}
          >
            {t('common.save')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTest}
            disabled={!connection || testConnection.isPending}
          >
            {t('invoices.parasut.testConnection')}
          </Button>
          {connection && (status === 'connected' || status === 'error' || connection.companyId) && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDisconnect}
              disabled={deleteConnection.isPending}
            >
              {t('invoices.parasut.disconnect')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
