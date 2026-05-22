import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useParasutConnection,
  useSaveParasutConnection,
  useGetParasutAuthorizeUrl,
  useConnectParasut,
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
  const getAuthorizeUrl = useGetParasutAuthorizeUrl();
  const connectParasut = useConnectParasut();
  const testConnection = useTestParasutConnection();
  const deleteConnection = useDeleteParasutConnection();
  const addToast = useToastStore((s) => s.addToast);

  // The client secret is never returned by the API, so it always starts
  // blank. Client id / company id are prefilled from the saved row.
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [companyId, setCompanyId] = useState('');
  // Authorization-code paste step.
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (connection) {
      setCompanyId(connection.companyId ?? '');
    }
  }, [connection]);

  if (isError) return <QueryErrorState onRetry={() => refetch()} />;
  if (isLoading) return <></>;

  const status = connection?.status ?? 'disconnected';
  const isSaved = !!connection?.companyId;
  const statusVariant =
    status === 'connected' ? 'success' : status === 'error' ? 'error' : 'default';
  const statusLabel =
    status === 'connected'
      ? t('invoices.parasut.statusConnected')
      : status === 'error'
        ? t('invoices.parasut.statusError')
        : t('invoices.parasut.statusDisconnected');

  const canSave = clientId.trim() && clientSecret && companyId.trim();

  const handleSave = () => {
    saveConnection.mutate(
      {
        clientId: clientId.trim(),
        clientSecret,
        companyId: companyId.trim(),
      },
      {
        onSuccess: () => {
          setClientSecret('');
          setShowCodeInput(false);
          setCode('');
          addToast({ type: 'success', message: t('invoices.parasut.saved') });
        },
        onError: () => addToast({ type: 'error', message: t('common.error') }),
      },
    );
  };

  const handleConnect = () => {
    getAuthorizeUrl.mutate(undefined, {
      onSuccess: ({ url }) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        setShowCodeInput(true);
      },
      onError: () => addToast({ type: 'error', message: t('common.error') }),
    });
  };

  const handleCompleteConnection = () => {
    connectParasut.mutate(code.trim(), {
      onSuccess: (result) => {
        setCode('');
        setShowCodeInput(false);
        if (result.connected) {
          addToast({ type: 'success', message: t('invoices.parasut.testSuccess') });
        } else {
          addToast({ type: 'error', message: result.lastError || t('invoices.parasut.testFailed') });
        }
      },
      onError: () => addToast({ type: 'error', message: t('invoices.parasut.testFailed') }),
    });
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
        setCompanyId('');
        setShowCodeInput(false);
        setCode('');
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
            {t('invoices.parasut.connectedAs', { companyId: connection.companyId })}
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
          placeholder={isSaved ? '••••••••' : undefined}
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
        </div>
      </div>

      {/* Authorization step — available once credentials are saved. */}
      {isSaved && (
        <div style={sectionBoxStyle}>
          <span style={sectionLabelStyle}>{t('invoices.parasut.authorization')}</span>
          <div style={infoTextStyle}>{t('invoices.parasut.authorizeHint')}</div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConnect}
              disabled={getAuthorizeUrl.isPending}
            >
              {t('invoices.parasut.connect')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={testConnection.isPending}
            >
              {t('invoices.parasut.testConnection')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDisconnect}
              disabled={deleteConnection.isPending}
            >
              {t('invoices.parasut.disconnect')}
            </Button>
          </div>

          {showCodeInput && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <Input
                label={t('invoices.parasut.pasteCode')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                size="sm"
              />
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCompleteConnection}
                  disabled={!code.trim() || connectParasut.isPending}
                >
                  {t('invoices.parasut.completeConnection')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
