import { useState } from 'react';
import type { Program, Plan, Course } from '../types';
import { createEmptyPlan } from '../types';
import { autoPopulatePlan } from '../utils/autoPopulate';
import { DEPARTMENTS } from '../utils/departments';

interface Props {
  onFinish: () => void;
  programs: Program[];
  catalog: Record<string, Course>;
  onCreatePlans: (plans: Plan[]) => void;
}

export default function Onboarding({ onFinish, programs, catalog, onCreatePlans }: Props) {
  const [step, setStep] = useState<'dept' | 'major' | 'concentration'>('dept');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedConcentration, setSelectedConcentration] = useState<string | null>(null);

  const dept = DEPARTMENTS.find(d => d.name === selectedDept);
  const deptPrograms = dept
    ? programs.filter(p => dept.programIds.includes(p.id))
    : [];
  const selectedProgram = programs.find(p => p.id === selectedMajor);
  const concentrations = selectedProgram?.concentrations?.options ?? [];
  type Conc = typeof concentrations[number];

  function handleDept(name: string) {
    setSelectedDept(name);
    const d = DEPARTMENTS.find(x => x.name === name);
    if (!d || d.programIds.length === 0) {
      onFinish();
      return;
    }
    const progs = programs.filter(p => d.programIds.includes(p.id));
    if (progs.length === 1) {
      setSelectedMajor(progs[0].id);
      if (progs[0].concentrations && progs[0].concentrations.options.length > 0) {
        setStep('concentration');
      } else {
        finish(progs[0].id, null);
      }
    } else {
      setStep('major');
    }
  }

  function handleMajor(id: string) {
    setSelectedMajor(id);
    const p = programs.find(x => x.id === id);
    if (p?.concentrations && p.concentrations.options.length > 0) {
      setStep('concentration');
    } else {
      finish(id, null);
    }
  }

  function finish(majorId: string, concId: string | null) {
    const p = programs.find(x => x.id === majorId);
    if (!p) {
      onFinish();
      return;
    }
    const graduation = programs.find(x => x.id === 'colby_graduation');
    const result = autoPopulatePlan(p, catalog, concId || undefined, graduation);
    const plan = createEmptyPlan('Plan A', majorId);
    plan.years = result.years;
    plan.requirements = result.requirements;
    onCreatePlans([plan]);
    onFinish();
  }

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-[90%] max-w-lg max-h-[80vh] flex flex-col">
        <div className="px-7 pt-6">
          <h2 className="text-xl font-extrabold mb-1">
            {step === 'dept' && 'Welcome to Colby Pathfinder'}
            {step === 'major' && 'Choose your major'}
            {step === 'concentration' && 'Choose your concentration'}
          </h2>
          <p className="text-sm text-gray-500">
            {step === 'dept' && 'Pick a department to get a suggested 4-year plan. You can always change it later.'}
            {step === 'major' && `${selectedDept} offers multiple programs. Pick the one that fits you.`}
            {step === 'concentration' && `${selectedProgram?.name} has different tracks. Pick one to tailor your plan.`}
          </p>
        </div>

        <div className="px-7 py-5 overflow-y-auto flex-1">
          {step === 'dept' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {DEPARTMENTS.map(d => (
                <button
                  key={d.name}
                  onClick={() => handleDept(d.name)}
                  className="p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                >
                  <div className="font-semibold text-sm">{d.name}</div>
                </button>
              ))}
            </div>
          )}

          {step === 'major' && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deptPrograms.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleMajor(p.id)}
                  className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                >
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.total.count} {p.total.unit === 'credit_hours' ? 'credits' : 'courses'}
                    {p.concentrations && p.concentrations.options.length > 0 && ` • ${p.concentrations.options.length} tracks`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'concentration' && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <button
                onClick={() => finish(selectedMajor!, null)}
                className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
              >
                <div className="font-semibold text-sm">Standard {selectedProgram?.name}</div>
                <div className="text-xs text-gray-500">No concentration</div>
              </button>
              {concentrations.map((c: Conc) => (
                <button
                  key={c.id}
                  onClick={() => finish(selectedMajor!, c.id)}
                  className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                >
                  <div className="font-semibold text-sm">{c.name}</div>
                  {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-7 pb-6 pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onFinish} className="text-sm text-gray-400 hover:text-gray-600 underline">
            Skip
          </button>
          {step !== 'dept' && (
            <button
              onClick={() => {
                if (step === 'concentration') {
                  setStep('major');
                  setSelectedConcentration(null);
                } else if (step === 'major') {
                  setStep('dept');
                  setSelectedMajor(null);
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
