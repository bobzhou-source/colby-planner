import { useStore } from '../store';
import { createEmptyPlan } from '../types';

export default function PlanTabs() {
  const { data, plans, activePlanIndex, setActivePlan, addPlan, removePlan } = useStore();

  function cloneCurrentPlan() {
    const current = plans[activePlanIndex];
    if (!current || !data) return;
    const newPlan = createEmptyPlan(
      `Plan ${String.fromCharCode(65 + plans.length)}`,
      current.program_id
    );
    newPlan.years = JSON.parse(JSON.stringify(current.years));
    newPlan.concentration_id = current.concentration_id;
    newPlan.requirements = JSON.parse(JSON.stringify(current.requirements));
    addPlan(newPlan);
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-1.5 flex items-center gap-1 shrink-0 overflow-x-auto">
      {plans.map((plan, i) => (
        <div
          key={plan.id}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-colors ${
            i === activePlanIndex
              ? 'bg-blue-50 text-blue-700 border border-blue-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActivePlan(i)}
        >
          {plan.name}
          {plans.length > 1 && (
            <button
              className="ml-1 text-xs opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                removePlan(i);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={cloneCurrentPlan}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300 text-lg"
        title="What if? Clone this plan"
      >
        +
      </button>
    </div>
  );
}
