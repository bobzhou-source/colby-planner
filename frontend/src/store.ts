import { create } from 'zustand';
import type { AppData, Plan, Program, Course } from './types';
import { createEmptyPlan } from './types';
import { decodePlan } from './utils/planEncoder';
import { autoPopulatePlan } from './utils/autoPopulate';

interface AppState {
  data: AppData | null;
  loading: boolean;
  error: string | null;

  plans: Plan[];
  activePlanIndex: number;

  compareMode: boolean;
  searchOpen: boolean;
  sidebarOpen: boolean;
  onboardingDone: boolean;
  searchTarget: { year: string; term: string };
  searchFilter: string[] | null;

  loadData: () => Promise<void>;
  addPlan: (plan: Plan) => void;
  removePlan: (index: number) => void;
  setActivePlan: (index: number) => void;
  updatePlan: (index: number, updater: (plan: Plan) => Plan) => void;
  moveCourse: (from: { planIndex: number; year: string; term: string; courseId: string }, to: { year: string; term: string }) => void;
  toggleCompare: () => void;
  toggleSearch: () => void;
  openSearch: (target?: { year: string; term: string }, filter?: string[] | null) => void;
  toggleSidebar: () => void;
  finishOnboarding: () => void;
  loadPlanFromHash: () => void;
}

function savePlansToStorage(plans: Plan[]) {
  try {
    localStorage.setItem('colby-planner-plans', JSON.stringify(plans));
  } catch { /* ignore */ }
}

export const useStore = create<AppState>((set, get) => ({
  data: null,
  loading: true,
  error: null,

  plans: [],
  activePlanIndex: 0,

  compareMode: false,
  searchOpen: false,
  sidebarOpen: true,
  onboardingDone: false,
  searchTarget: { year: 'year1', term: 'fall' },
  searchFilter: null,

  loadData: async () => {
    try {
      const res = await fetch('./data.json');
      const data: AppData = await res.json();
      set({ data, loading: false });

      // Check for shared link first
      const hash = window.location.hash.slice(1);
      if (hash && hash.length > 5) {
        const plan = decodePlan(hash, 'Shared Plan');
        if (plan) {
          set({ plans: [plan], activePlanIndex: 0, onboardingDone: true });
          savePlansToStorage([plan]);
          return;
        }
      }

      // Otherwise, start fresh (onboarding will show)
      if (get().plans.length === 0 && data.programs.length > 0) {
        // Don't auto-create a plan — let onboarding handle it
        // Just ensure data is loaded
      }
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addPlan: (plan) => {
    const plans = [...get().plans, plan];
    set({ plans, activePlanIndex: plans.length - 1, compareMode: false });
    savePlansToStorage(plans);
  },

  removePlan: (index) => {
    const plans = get().plans.filter((_, i) => i !== index);
    const activePlanIndex = Math.min(get().activePlanIndex, plans.length - 1);
    set({ plans, activePlanIndex });
    savePlansToStorage(plans);
  },

  setActivePlan: (index) => {
    set({ activePlanIndex: index, compareMode: false });
  },

  updatePlan: (index, updater) => {
    const plans = get().plans.map((p, i) => i === index ? updater(p) : p);
    set({ plans });
    savePlansToStorage(plans);
  },

  moveCourse: (from, to) => {
    const { plans } = get();
    const plan = plans[from.planIndex];
    const years = { ...plan.years };
    const fromYear = { ...years[from.year as keyof typeof years] };
    const toYear = { ...years[to.year as keyof typeof years] };

    // Remove from source
    (fromYear as any)[from.term] = (fromYear as any)[from.term].filter((id: string) => id !== from.courseId);
    // Add to dest
    (toYear as any)[to.term] = [...(toYear as any)[to.term], from.courseId];

    years[from.year as keyof typeof years] = fromYear as any;
    years[to.year as keyof typeof years] = toYear as any;

    const newPlan = { ...plan, years };
    const newPlans = plans.map((p, i) => i === from.planIndex ? newPlan : p);
    set({ plans: newPlans });
    savePlansToStorage(newPlans);
  },

  toggleCompare: () => set(s => ({ compareMode: !s.compareMode })),
  toggleSearch: () => set(s => ({ searchOpen: !s.searchOpen, searchFilter: s.searchOpen ? null : s.searchFilter })),
  openSearch: (target, filter) => set(s => ({
    searchOpen: true,
    searchTarget: target || s.searchTarget,
    searchFilter: filter !== undefined ? filter : s.searchFilter,
  })),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  finishOnboarding: () => {
    set({ onboardingDone: true });
  },

  loadPlanFromHash: () => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const plan = decodePlan(hash, 'Shared Plan');
    if (plan) {
      set({ plans: [plan], activePlanIndex: 0 });
      savePlansToStorage([plan]);
    }
  },
}));

// Auto-load data on first use
let dataLoaded = false;
export function ensureDataLoaded() {
  if (!dataLoaded) {
    dataLoaded = true;
    useStore.getState().loadData();
  }
}
