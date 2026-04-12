import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  TABLE_TEMPLATES,
  TABLE_TEMPLATE_CATEGORIES,
  TABLE_CATEGORY_COLORS,
  type TableTemplate,
  type TableTemplateCategory,
} from '../lib/table-template-data';
import { getTemplateIcon } from '../lib/table-constants';

// ─── Card preview lines ─────────────────────────────────────────────

function CardPreviewLines() {
  return (
    <div className="tg-card-preview">
      <div className="tg-card-preview-line is-heading" />
      <div className="tg-card-preview-line w-90" />
      <div className="tg-card-preview-line w-70" />
      <div className="tg-card-preview-line w-80" />
      <div className="tg-card-preview-line w-55" />
    </div>
  );
}

function TableTemplateCard({
  template,
  onClick,
}: {
  template: TableTemplate;
  onClick: () => void;
}) {
  return (
    <button className="tg-card" onClick={onClick}>
      <div className="tg-card-header" style={{ background: TABLE_CATEGORY_COLORS[template.category] }}>
        <CardPreviewLines />
        <div className="tg-card-overlay">
          <span className="tg-card-use-btn">Use template</span>
        </div>
      </div>
      <div className="tg-card-body">
        <div className="tg-card-name-row">
          <span className="tg-card-icon">{(() => { const Icon = getTemplateIcon(template.icon); return <Icon size={16} />; })()}</span>
          <span className="tg-card-name">{template.name}</span>
        </div>
        <p className="tg-card-desc">{template.description}</p>
        {template.tags.length > 0 && (
          <div className="tg-card-tags">
            {template.tags.map((tag) => (
              <span key={tag} className="tg-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Template gallery ───────────────────────────────────────────────

export function TableTemplateGallery({
  onSelect,
  onClose,
}: {
  onSelect: (template: TableTemplate) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | TableTemplateCategory>('All');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return TABLE_TEMPLATES.filter((tpl) => {
      const matchesCategory = activeCategory === 'All' || tpl.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map: Partial<Record<TableTemplateCategory, TableTemplate[]>> = {};
    for (const tpl of filtered) {
      (map[tpl.category] ??= []).push(tpl);
    }
    return map;
  }, [filtered]);

  return (
    <div className="tg-root">
      {/* Header */}
      <div className="tg-header">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onClose} className="tg-back-btn">
          {t('tables.backToTables')}
        </Button>
        <div className="tg-header-spacer" />
        <div className="tg-search">
          <Search size={14} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tables.searchTemplates')}
          />
        </div>
      </div>

      {/* Body */}
      <div className="tg-body">
        <div className="tg-hero">
          <h2 className="tg-hero-title">{t('tables.templateGalleryTitle')}</h2>
          <p className="tg-hero-sub">{t('tables.templateGallerySub')}</p>
        </div>

        {/* Category pills */}
        <div className="tg-pills">
          <button
            className={`tg-pill${activeCategory === 'All' ? ' is-active' : ''}`}
            onClick={() => setActiveCategory('All')}
          >
            {t('tables.templateCategoryAll')}
          </button>
          {TABLE_TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`tg-pill${activeCategory === cat ? ' is-active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Blank card + template groups */}
        {filtered.length === 0 ? (
          <div className="tg-empty">
            <span>{t('tables.noTemplatesFound')}</span>
          </div>
        ) : activeCategory === 'All' ? (
          <>
            {/* Blank table card */}
            {!query && (
              <div className="tg-category-section">
                <h3 className="tg-category-label">{t('tables.startFresh')}</h3>
                <div className="tg-grid">
                  <button className="tg-card is-blank" onClick={() => onClose()}>
                    <div className="tg-blank-header">
                      <span className="tg-blank-plus">+</span>
                    </div>
                    <div className="tg-card-body">
                      <div className="tg-card-name-row">
                        <span className="tg-card-icon"><FileText size={16} /></span>
                        <span className="tg-card-name">{t('tables.blankTable')}</span>
                      </div>
                      <p className="tg-card-desc">{t('tables.blankTableDesc')}</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
            {TABLE_TEMPLATE_CATEGORIES.map((cat) => {
              const items = grouped[cat];
              if (!items?.length) return null;
              return (
                <div key={cat} className="tg-category-section">
                  <h3 className="tg-category-label">{cat}</h3>
                  <div className="tg-grid">
                    {items.map((tpl) => (
                      <TableTemplateCard key={tpl.key} template={tpl} onClick={() => onSelect(tpl)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="tg-category-section">
            <div className="tg-grid">
              {filtered.map((tpl) => (
                <TableTemplateCard key={tpl.key} template={tpl} onClick={() => onSelect(tpl)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export { TABLE_TEMPLATES } from '../lib/table-template-data';
export type { TableTemplate } from '../lib/table-template-data';
