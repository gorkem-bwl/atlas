import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DockPet, PetPreview, PET_OPTIONS } from '../src/components/home/dock-pet';
import type { PetType } from '../src/components/home/dock-pet';

// Mock i18n for any transitive imports
vi.mock('../src/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));

describe('DockPet', () => {
  it('renders nothing when pet is none', () => {
    const { container } = render(<DockPet pet="none" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders an img element when pet is cat', () => {
    render(<DockPet pet="cat" />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('renders an img element when pet is fox', () => {
    render(<DockPet pet="fox" />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('sets img to 40x40 pixels', () => {
    render(<DockPet pet="cat" />);
    const img = document.querySelector('img');
    expect(img?.style.width).toBe('40px');
    expect(img?.style.height).toBe('40px');
  });

  it('uses pixelated image rendering', () => {
    render(<DockPet pet="dragon" />);
    const img = document.querySelector('img');
    expect(img?.style.imageRendering).toBe('pixelated');
  });

  it('positions pet absolutely', () => {
    render(<DockPet pet="cat" />);
    const img = document.querySelector('img');
    expect(img?.style.position).toBe('absolute');
  });

  it('applies custom bottomOffset', () => {
    render(<DockPet pet="cat" bottomOffset={100} />);
    const img = document.querySelector('img');
    expect(img?.style.bottom).toBe('100px');
  });

  it('defaults to cat pet when no pet prop provided', () => {
    render(<DockPet />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.src).toContain('/pets/cat/');
  });
});

describe('PET_OPTIONS', () => {
  it('has 5 entries', () => {
    expect(PET_OPTIONS).toHaveLength(5);
  });

  it('includes none option', () => {
    expect(PET_OPTIONS.find((o) => o.id === 'none')).toBeDefined();
  });

  it('includes cat option', () => {
    expect(PET_OPTIONS.find((o) => o.id === 'cat')).toBeDefined();
  });

  it('includes fox option', () => {
    expect(PET_OPTIONS.find((o) => o.id === 'fox')).toBeDefined();
  });

  it('includes dragon option', () => {
    expect(PET_OPTIONS.find((o) => o.id === 'dragon')).toBeDefined();
  });

  it('includes unicorn option', () => {
    expect(PET_OPTIONS.find((o) => o.id === 'unicorn')).toBeDefined();
  });

  it('each option has a label', () => {
    PET_OPTIONS.forEach((opt) => {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
    });
  });
});

describe('PetPreview', () => {
  it('renders an animated sprite image', () => {
    render(<PetPreview pet="cat" />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.src).toContain('/pets/cat/walk-east/');
  });

  it('defaults to 48px size', () => {
    render(<PetPreview pet="fox" />);
    const img = document.querySelector('img');
    expect(img?.style.width).toBe('48px');
    expect(img?.style.height).toBe('48px');
  });

  it('accepts custom size', () => {
    render(<PetPreview pet="dragon" size={64} />);
    const img = document.querySelector('img');
    expect(img?.style.width).toBe('64px');
    expect(img?.style.height).toBe('64px');
  });

  it('uses pixelated rendering', () => {
    render(<PetPreview pet="unicorn" />);
    const img = document.querySelector('img');
    expect(img?.style.imageRendering).toBe('pixelated');
  });

  it('has alt text matching pet name', () => {
    render(<PetPreview pet="cat" />);
    const img = screen.getByAltText('cat');
    expect(img).toBeInTheDocument();
  });
});
