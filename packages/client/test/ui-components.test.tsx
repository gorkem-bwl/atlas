import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Badge } from '../src/components/ui/badge';
import { Modal } from '../src/components/ui/modal';

// Mock i18n for any transitive imports
vi.mock('../src/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument();
  });

  it('applies primary variant background', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByText('Primary');
    expect(btn.style.background).toBe('var(--color-accent-primary)');
  });

  it('applies danger variant color', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByText('Delete');
    expect(btn.style.color).toBe('var(--color-error)');
  });

  it('applies sm size height', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByText('Small');
    expect(btn.style.height).toBe('28px');
  });

  it('applies md size height by default', () => {
    render(<Button>Default</Button>);
    const btn = screen.getByText('Default');
    expect(btn.style.height).toBe('34px');
  });

  it('applies lg size height', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByText('Large');
    expect(btn.style.height).toBe('40px');
  });

  it('renders icon when provided', () => {
    render(<Button icon={<span data-testid="icon">★</span>}>With icon</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('forwards disabled prop', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('applies sm size height', () => {
    render(<Input size="sm" placeholder="sm" />);
    const input = screen.getByPlaceholderText('sm');
    expect(input.style.height).toBe('28px');
  });

  it('links label to input via htmlFor', () => {
    render(<Input label="Username" />);
    const label = screen.getByText('Username');
    const input = document.getElementById('input-username');
    expect(label).toHaveAttribute('for', 'input-username');
    expect(input).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    const { container } = render(<Badge variant="default">Default</Badge>);
    expect(container.textContent).toContain('Default');
  });

  it('renders with success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders with error variant', () => {
    render(<Badge variant="error">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal open={true} onOpenChange={() => {}}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <Modal open={false} onOpenChange={() => {}}>
        <div>Hidden content</div>
      </Modal>
    );
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('renders Modal.Header with title', () => {
    render(
      <Modal open={true} onOpenChange={() => {}}>
        <Modal.Header title="Settings" />
      </Modal>
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders Modal.Body content', () => {
    render(
      <Modal open={true} onOpenChange={() => {}}>
        <Modal.Body>Body content here</Modal.Body>
      </Modal>
    );
    expect(screen.getByText('Body content here')).toBeInTheDocument();
  });

  it('renders Modal.Footer content', () => {
    render(
      <Modal open={true} onOpenChange={() => {}}>
        <Modal.Footer>
          <button>Save</button>
        </Modal.Footer>
      </Modal>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders close button with aria-label', () => {
    render(
      <Modal open={true} onOpenChange={() => {}}>
        <Modal.Header title="Test" />
      </Modal>
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});
