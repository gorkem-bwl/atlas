import { create } from 'zustand';
import type { TourStep } from './tour-types';

interface TourState {
  isOpen: boolean;
  steps: TourStep[];
  currentStepIndex: number;
  open: (steps: TourStep[]) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  reset: () => void;
}

export const useTour = create<TourState>((set, get) => ({
  isOpen: false,
  steps: [],
  currentStepIndex: 0,

  open: (steps) => {
    if (steps.length === 0) return;
    set({ isOpen: true, steps, currentStepIndex: 0 });
  },

  next: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex >= steps.length - 1) {
      get().finish();
      return;
    }
    set({ currentStepIndex: currentStepIndex + 1 });
  },

  prev: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex <= 0) return;
    set({ currentStepIndex: currentStepIndex - 1 });
  },

  skip: () => {
    set({ isOpen: false, steps: [], currentStepIndex: 0 });
  },

  finish: () => {
    set({ isOpen: false, steps: [], currentStepIndex: 0 });
  },

  reset: () => {
    set({ isOpen: false, steps: [], currentStepIndex: 0 });
  },
}));
