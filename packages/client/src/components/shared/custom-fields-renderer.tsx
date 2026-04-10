import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomFieldValues, useSaveCustomFieldValues } from '../../hooks/use-custom-fields';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import type { CustomFieldWithValue } from '@atlas-platform/shared';

interface CustomFieldsRendererProps {
  appId: string;
  recordType: string;
  recordId: string;
}

/**
 * Renders custom field form for a record. Self-contained — fetches definitions
 * and values, auto-saves on change with debounce.
 */
export function CustomFieldsRenderer({ appId, recordType, recordId }: CustomFieldsRendererProps) {
  const { t } = useTranslation();
  const { data: fields } = useCustomFieldValues(appId, recordType, recordId);
  const saveMutation = useSaveCustomFieldValues(appId, recordType, recordId);

  // Local form state keyed by field definition ID
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const localValuesRef = useRef(localValues);
  localValuesRef.current = localValues;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync server values into local state when data loads or record changes
  useEffect(() => {
    if (fields) {
      const vals: Record<string, unknown> = {};
      for (const f of fields) {
        vals[f.id] = f.value ?? getDefaultValue(f.fieldType);
      }
      setLocalValues(vals);
    }
  }, [fields]);

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setLocalValues(prev => ({ ...prev, [fieldId]: value }));

    // Debounced auto-save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const values = Object.entries(localValuesRef.current).map(([fId, v]) => ({
        fieldDefinitionId: fId,
        value: v,
      }));
      saveMutation.mutate(values);
    }, 800);
  }, [saveMutation]);

  // Cleanup debounce on unmount or record change
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [recordId]);

  if (!fields || fields.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-family)',
          }}
        >
          {t('customFields.sectionTitle')}
        </span>
        {saveMutation.isError && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', fontFamily: 'var(--font-family)' }}>
            {t('common.saveFailed')}
          </span>
        )}
      </div>
      {fields.map(field => (
        <FieldInput
          key={field.id}
          field={field}
          value={localValues[field.id]}
          onChange={(v) => handleChange(field.id, v)}
        />
      ))}
    </div>
  );
}

function getDefaultValue(fieldType: string): unknown {
  switch (fieldType) {
    case 'boolean': return false;
    case 'number': return null;
    case 'multi_select': return [];
    default: return '';
  }
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldWithValue;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { t } = useTranslation();

  const label = field.isRequired ? `${field.name} *` : field.name;

  switch (field.fieldType) {
    case 'text': {
      const isMultiline = !!(field.options as Record<string, unknown>)?.multiline;
      if (isMultiline) {
        return (
          <Textarea
            label={label}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('customFields.placeholder.textarea')}
          />
        );
      }
      return (
        <Input
          label={label}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('customFields.placeholder.text')}
          size="sm"
        />
      );
    }

    case 'url':
      return (
        <Input
          label={label}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          size="sm"
        />
      );

    case 'number':
      return (
        <Input
          label={label}
          type="number"
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={t('customFields.placeholder.number')}
          size="sm"
        />
      );

    case 'date':
      return (
        <Input
          label={label}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="sm"
        />
      );

    case 'boolean':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
          />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
            {label}
          </span>
        </div>
      );

    case 'select': {
      const choices = ((field.options as Record<string, unknown>)?.choices as Array<{ label: string; value: string }>) ?? [];
      return (
        <Select
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v)}
          options={[
            { value: '', label: t('customFields.placeholder.select') },
            ...choices.map(c => ({ value: c.value, label: c.label })),
          ]}
          size="sm"
        />
      );
    }

    case 'multi_select': {
      const choices = ((field.options as Record<string, unknown>)?.choices as Array<{ label: string; value: string }>) ?? [];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
            {label}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
            {choices.map(c => {
              const isSelected = selected.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selected.filter(v => v !== c.value)
                      : [...selected, c.value];
                    onChange(next);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: 'var(--font-size-xs)',
                    fontFamily: 'var(--font-family)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isSelected ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                    background: isSelected ? 'var(--color-accent-subtle)' : 'transparent',
                    color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    default:
      return (
        <Input
          label={label}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          size="sm"
        />
      );
  }
}
