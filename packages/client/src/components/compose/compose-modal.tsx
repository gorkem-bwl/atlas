import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState, useCallback } from 'react';
import { X, Minus, Maximize2, Send, ChevronDown } from 'lucide-react';
import { useEmailStore } from '../../stores/email-store';
import { Button } from '../ui/button';
import type { CSSProperties } from 'react';

interface ComposeField {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}

function RecipientField({ label, value, placeholder, onChange }: ComposeField) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-primary)',
      }}
    >
      <label
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family)',
          width: 28,
          flexShrink: 0,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-md)',
          fontFamily: 'var(--font-family)',
          padding: '2px 0',
        }}
      />
    </div>
  );
}

// Safely clears a contenteditable element by removing all child nodes (avoids innerHTML XSS)
function clearContentEditable(el: HTMLElement) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export function ComposeModal() {
  const { composeMode, closeCompose } = useEmailStore();
  const isOpen = composeMode !== null;

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    closeCompose();
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setShowCcBcc(false);
    if (bodyRef.current) clearContentEditable(bodyRef.current);
  }, [closeCompose]);

  const handleSend = useCallback(() => {
    // TODO: wire up send mutation
    handleClose();
  }, [handleClose]);

  const getTitle = () => {
    switch (composeMode) {
      case 'reply': return 'Reply';
      case 'reply_all': return 'Reply all';
      case 'forward': return 'Forward';
      default: return 'New message';
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-bg-overlay)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            bottom: 'var(--spacing-xl)',
            right: 'var(--spacing-xl)',
            width: 560,
            maxHeight: '80vh',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 51,
            fontFamily: 'var(--font-family)',
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              background: 'var(--color-bg-tertiary)',
              borderBottom: '1px solid var(--color-border-primary)',
              flexShrink: 0,
            }}
          >
            <Dialog.Title
              style={{
                margin: 0,
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
              }}
            >
              {getTitle()}
            </Dialog.Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <button aria-label="Minimize" style={windowControlStyle}>
                <Minus size={13} />
              </button>
              <button aria-label="Expand" style={windowControlStyle}>
                <Maximize2 size={13} />
              </button>
              <button
                aria-label="Close and discard"
                onClick={handleClose}
                style={windowControlStyle}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Recipient fields */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <RecipientField label="To" value={to} onChange={setTo} placeholder="Recipients" />
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                aria-label="Toggle CC and BCC fields"
                style={{
                  position: 'absolute',
                  right: 'var(--spacing-lg)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  padding: 'var(--spacing-xs)',
                }}
              >
                Cc/Bcc <ChevronDown size={12} />
              </button>
            </div>
            {showCcBcc && (
              <>
                <RecipientField label="Cc" value={cc} onChange={setCc} placeholder="CC recipients" />
                <RecipientField label="Bcc" value={bcc} onChange={setBcc} placeholder="BCC recipients" />
              </>
            )}
            <div
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                borderBottom: '1px solid var(--color-border-primary)',
              }}
            >
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                  fontFamily: 'var(--font-family)',
                  padding: '4px 0',
                }}
              />
            </div>
          </div>

          {/* Composable body — contenteditable for rich text editing */}
          <div
            ref={bodyRef}
            role="textbox"
            aria-label="Email body"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            style={{
              flex: 1,
              padding: 'var(--spacing-lg)',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              lineHeight: 'var(--line-height-normal)',
              fontFamily: 'var(--font-family)',
              overflowY: 'auto',
              minHeight: 180,
              cursor: 'text',
            }}
          />

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderTop: '1px solid var(--color-border-primary)',
              background: 'var(--color-bg-tertiary)',
              flexShrink: 0,
            }}
          >
            <Button
              variant="primary"
              size="md"
              icon={<Send size={14} />}
              onClick={handleSend}
            >
              Send
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                Send with
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 6px',
                }}
              >
                Cmd+Enter
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const windowControlStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
};
