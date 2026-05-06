import { useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useStore, ensureDataLoaded } from './store';
import type { Plan } from './types';
import Onboarding from './components/Onboarding';
import Header from './components/Header';
import PlanTabs from './components/PlanTabs';
import SemesterGrid from './components/SemesterGrid';
import RequirementSidebar from './components/RequirementSidebar';
import SearchDrawer from './components/SearchDrawer';
import CompareView from './components/CompareView';

function AppContent() {
  const { data, loading, error, onboardingDone, finishOnboarding, compareMode, sidebarOpen } = useStore();

  useEffect(() => {
    ensureDataLoaded();
  }, []);

  const handleCreatePlans = useCallback((plans: Plan[]) => {
    useStore.setState({ plans, activePlanIndex: 0 });
    try {
      localStorage.setItem('colby-planner-plans', JSON.stringify(plans));
    } catch {}
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Colby Pathfinder</div>
          <div className="text-gray-500">Loading course catalog...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-xl font-bold mb-2">Error loading data</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {!onboardingDone && (
        <Onboarding
          onFinish={finishOnboarding}
          programs={data.programs}
          catalog={data.catalog.courses}
          onCreatePlans={handleCreatePlans}
        />
      )}

      <Header />
      <PlanTabs />

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && !compareMode && (
          <RequirementSidebar />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-5">
          {compareMode ? (
            <CompareView />
          ) : (
            <SemesterGrid />
          )}
        </main>
      </div>

      <SearchDrawer />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<AppContent />} />
      </Routes>
    </HashRouter>
  );
}
