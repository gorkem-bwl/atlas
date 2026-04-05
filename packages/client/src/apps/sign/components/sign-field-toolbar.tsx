import { useTranslation } from 'react-i18next';
import {
  PenTool,
  Type,
  Calendar,
  AlignLeft,
  CheckSquare,
  ChevronDown,
  User,
  Mail,
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/tooltip';
import type { SignatureFieldType } from '@atlasmail/shared';

export function SignFieldToolbar({
  onAddField,
}: {
  onAddField: (type: SignatureFieldType) => void;
}) {
  const { t } = useTranslation();

  const makeDragStart = (type: SignatureFieldType) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/sign-field-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="sign-field-toolbar">
      <div className="sign-field-toolbar-group">
        <Tooltip content={t('sign.fields.signature')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('signature')}
            onClick={() => onAddField('signature')}
          >
            <PenTool size={18} />
          </button>
        </Tooltip>
        <Tooltip content={t('sign.fields.initials')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('initials')}
            onClick={() => onAddField('initials')}
          >
            <Type size={18} />
          </button>
        </Tooltip>
      </div>
      <div className="sign-field-toolbar-divider" />
      <div className="sign-field-toolbar-group">
        <Tooltip content={t('sign.fields.date')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('date')}
            onClick={() => onAddField('date')}
          >
            <Calendar size={18} />
          </button>
        </Tooltip>
        <Tooltip content={t('sign.fields.text')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('text')}
            onClick={() => onAddField('text')}
          >
            <AlignLeft size={18} />
          </button>
        </Tooltip>
      </div>
      <div className="sign-field-toolbar-divider" />
      <div className="sign-field-toolbar-group">
        <Tooltip content={t('sign.fields.checkbox')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('checkbox')}
            onClick={() => onAddField('checkbox')}
          >
            <CheckSquare size={18} />
          </button>
        </Tooltip>
        <Tooltip content={t('sign.fields.dropdown')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('dropdown')}
            onClick={() => onAddField('dropdown')}
          >
            <ChevronDown size={18} />
          </button>
        </Tooltip>
      </div>
      <div className="sign-field-toolbar-divider" />
      <div className="sign-field-toolbar-group">
        <Tooltip content={t('sign.fields.name')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('name')}
            onClick={() => onAddField('name')}
          >
            <User size={18} />
          </button>
        </Tooltip>
        <Tooltip content={t('sign.fields.email')} side="right">
          <button
            className="sign-field-toolbar-btn"
            draggable
            onDragStart={makeDragStart('email')}
            onClick={() => onAddField('email')}
          >
            <Mail size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
