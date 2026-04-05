import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutTemplate } from 'lucide-react';
import { DRAWING_TEMPLATES } from '../../../config/drawing-templates';

export function TemplatePicker({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, elements?: unknown[]) => void;
}) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!open) return null;

  const templates = [
    { id: 'blank', name: t('draw.templateBlank'), description: t('draw.templateBlankDesc') },
    { id: 'flowchart', name: t('draw.templateFlowchart'), description: t('draw.templateFlowchartDesc') },
    { id: 'wireframe', name: t('draw.templateWireframe'), description: t('draw.templateWireframeDesc') },
    { id: 'mindMap', name: t('draw.templateMindMap'), description: t('draw.templateMindMapDesc') },
    { id: 'kanban', name: t('draw.templateKanban'), description: t('draw.templateKanbanDesc') },
    { id: 'swot', name: t('draw.templateSwot'), description: t('draw.templateSwotDesc') },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-bg-overlay)',
          zIndex: 200,
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 560,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 96px)',
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-elevated)',
          zIndex: 201,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-family)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 12px',
            borderBottom: '1px solid var(--color-border-primary)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {t('draw.newDrawing')}
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: 'var(--color-text-tertiary)',
            }}
          >
            {t('draw.fromTemplate')}
          </p>
        </div>

        {/* Template grid */}
        <div
          style={{
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            overflowY: 'auto',
          }}
        >
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => {
                if (tmpl.id === 'blank') {
                  onCreate(t('draw.untitled'));
                } else {
                  const found = DRAWING_TEMPLATES.find((dt) => dt.id === tmpl.id);
                  onCreate(tmpl.name, found?.elements);
                }
                onClose();
              }}
              onMouseEnter={() => setHoveredId(tmpl.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '16px 12px',
                background: hoveredId === tmpl.id
                  ? 'var(--color-surface-hover)'
                  : 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-family)',
                minHeight: 100,
              }}
            >
              <LayoutTemplate
                size={24}
                style={{
                  color: hoveredId === tmpl.id
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-text-tertiary)',
                }}
              />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  textAlign: 'center',
                }}
              >
                {tmpl.name}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {tmpl.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
