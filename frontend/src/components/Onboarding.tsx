import { useState } from 'react';
import type { Program, Plan, Course } from '../types';
import { createEmptyPlan } from '../types';
import { autoPopulatePlan } from '../utils/autoPopulate';
import { DEPARTMENTS, getProgramDepartment } from '../utils/departments';
import { findCompatiblePrograms, isLikelyForbidden } from '../utils/programOverlap';

interface Props {
  onFinish: () => void;
  programs: Program[];
  catalog: Record<string, Course>;
  onCreatePlans: (plans: Plan[]) => void;
}

type Step =
  | 'dept'
  | 'major'
  | 'concentration'
  | 'add_secondary'
  | 'secondary_dept'
  | 'secondary_major'
  | 'secondary_concentration';

export default function Onboarding({ onFinish, programs, catalog, onCreatePlans }: Props) {
  const [step, setStep] = useState<Step>('dept');

  // Primary selections
  const [primaryDept, setPrimaryDept] = useState<string | null>(null);
  const [primaryMajor, setPrimaryMajor] = useState<string | null>(null);
  const [primaryConc, setPrimaryConc] = useState<string | null>(null);

  // Secondary selections
  const [secondaryDept, setSecondaryDept] = useState<string | null>(null);
  const [secondaryMajor, setSecondaryMajor] = useState<string | null>(null);
  const [secondaryConc, setSecondaryConc] = useState<string | null>(null);

  const primaryProgram = programs.find(p => p.id === primaryMajor);
  const primaryConcs = primaryProgram?.concentrations?.options ?? [];
  type Conc = typeof primaryConcs[number];

  const secondaryProgram = programs.find(p => p.id === secondaryMajor);
  const secondaryConcs = secondaryProgram?.concentrations?.options ?? [];

  function getDeptPrograms(deptName: string) {
    const d = DEPARTMENTS.find(x => x.name === deptName);
    if (!d) return [];
    return programs.filter(p => d.programIds.includes(p.id));
  }

  function handleDept(name: string) {
    setPrimaryDept(name);
    const progs = getDeptPrograms(name);
    if (progs.length === 0) {
      onFinish();
      return;
    }
    if (progs.length === 1) {
      setPrimaryMajor(progs[0].id);
      if (progs[0].concentrations && progs[0].concentrations.options.length > 0) {
        setStep('concentration');
      } else {
        setStep('add_secondary');
      }
    } else {
      setStep('major');
    }
  }

  function handleMajor(id: string) {
    setPrimaryMajor(id);
    const p = programs.find(x => x.id === id);
    if (p?.concentrations && p.concentrations.options.length > 0) {
      setStep('concentration');
    } else {
      setStep('add_secondary');
    }
  }

  function handleSecondaryDept(name: string) {
    setSecondaryDept(name);
    const progs = getDeptPrograms(name);
    if (progs.length === 0) {
      finish(primaryMajor!, primaryConc, null, null);
      return;
    }
    if (progs.length === 1) {
      setSecondaryMajor(progs[0].id);
      if (progs[0].concentrations && progs[0].concentrations.options.length > 0) {
        setStep('secondary_concentration');
      } else {
        finish(primaryMajor!, primaryConc, progs[0].id, null);
      }
    } else {
      setStep('secondary_major');
    }
  }

  function handleSecondaryMajor(id: string) {
    setSecondaryMajor(id);
    const p = programs.find(x => x.id === id);
    if (p?.concentrations && p.concentrations.options.length > 0) {
      setStep('secondary_concentration');
    } else {
      finish(primaryMajor!, primaryConc, id, null);
    }
  }

  function finish(
    majorId: string,
    concId: string | null,
    secondaryId: string | null,
    secondaryConcId: string | null,
  ) {
    const p = programs.find(x => x.id === majorId);
    if (!p) {
      onFinish();
      return;
    }
    const secondary = secondaryId ? programs.find(x => x.id === secondaryId) : undefined;
    const graduation = programs.find(x => x.id === 'colby_graduation');
    const result = autoPopulatePlan(p, catalog, concId || undefined, graduation, secondary);
    const plan = createEmptyPlan('Plan A', majorId);
    plan.years = result.years;
    plan.requirements = result.requirements;
    plan.concentration_id = concId || undefined;
    plan.secondary_program_id = secondaryId || undefined;
    onCreatePlans([plan]);
    onFinish();
  }

  function stepTitle() {
    switch (step) {
      case 'dept': return 'Welcome to Colby Pathfinder';
      case 'major': return 'Choose your major';
      case 'concentration': return 'Choose your concentration';
      case 'add_secondary': return 'Double major or minor?';
      case 'secondary_dept': return 'Choose second department';
      case 'secondary_major': return 'Choose second program';
      case 'secondary_concentration': return 'Choose concentration';
    }
  }

  function stepSubtitle() {
    switch (step) {
      case 'dept': return 'Pick a department to get a suggested 4-year plan. You can always change it later.';
      case 'major': return `${primaryDept} offers multiple programs. Pick the one that fits you.`;
      case 'concentration': return `${primaryProgram?.name} has different tracks. Pick one to tailor your plan.`;
      case 'add_secondary': return 'Would you like to add a second major or a minor to your plan?';
      case 'secondary_dept': return 'Pick the department for your second program.';
      case 'secondary_major': return `${secondaryDept} offers multiple programs. Pick your second major or minor.`;
      case 'secondary_concentration': return `${secondaryProgram?.name} has different tracks.`;
    }
  }

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-[90%] max-w-lg max-h-[80vh] flex flex-col">
        <div className="px-7 pt-6">
          <h2 className="text-xl font-extrabold mb-1">{stepTitle()}</h2>
          <p className="text-sm text-gray-500">{stepSubtitle()}</p>
        </div>

        <div className="px-7 py-5 overflow-y-auto flex-1">
          {/* Department grid */}
          {(step === 'dept' || step === 'secondary_dept') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {DEPARTMENTS.filter(d => {
                if (step === 'dept') return true;
                // Filter out same department as primary for secondary selection
                const primaryDept = getProgramDepartment(primaryMajor || '');
                return d.name !== primaryDept;
              }).map(d => (
                <button
                  key={d.name}
                  onClick={() => step === 'dept' ? handleDept(d.name) : handleSecondaryDept(d.name)}
                  className="p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                >
                  <div className="font-semibold text-sm">{d.name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Major list */}
          {(step === 'major' || step === 'secondary_major') && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(step === 'major' ? getDeptPrograms(primaryDept!) : getDeptPrograms(secondaryDept!)).map(p => (
                <button
                  key={p.id}
                  onClick={() => step === 'major' ? handleMajor(p.id) : handleSecondaryMajor(p.id)}
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

          {/* Concentration list */}
          {(step === 'concentration' || step === 'secondary_concentration') && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <button
                onClick={() => {
                  if (step === 'concentration') {
                    setPrimaryConc(null);
                    setStep('add_secondary');
                  } else {
                    finish(primaryMajor!, primaryConc, secondaryMajor!, null);
                  }
                }}
                className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
              >
                <div className="font-semibold text-sm">Standard {step === 'concentration' ? primaryProgram?.name : secondaryProgram?.name}</div>
                <div className="text-xs text-gray-500">No concentration</div>
              </button>
              {(step === 'concentration' ? primaryConcs : secondaryConcs).map((c: Conc) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (step === 'concentration') {
                      setPrimaryConc(c.id);
                      setStep('add_secondary');
                    } else {
                      finish(primaryMajor!, primaryConc, secondaryMajor!, c.id);
                    }
                  }}
                  className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                >
                  <div className="font-semibold text-sm">{c.name}</div>
                  {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                </button>
              ))}
            </div>
          )}

          {/* Add secondary? */}
          {step === 'add_secondary' && (
            <div className="space-y-3">
              {primaryProgram && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Recommended based on overlap
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(() => {
                      const primaryDept = getProgramDepartment(primaryProgram.id);
                      const eligiblePrograms = programs.filter(p => {
                        if (p.id === primaryProgram.id) return false;
                        const pDept = getProgramDepartment(p.id);
                        return pDept !== primaryDept;
                      });
                      const matches = findCompatiblePrograms(primaryProgram, eligiblePrograms);
                      const top = matches
                        .filter(m => !isLikelyForbidden(primaryProgram, m.program))
                        .slice(0, 6);
                      if (top.length === 0) {
                        return <div className="text-xs text-gray-400">No strong overlaps found. You can still browse all programs.</div>;
                      }
                      return top.map(m => (
                        <button
                          key={m.program.id}
                          onClick={() => {
                            setSecondaryMajor(m.program.id);
                            if (m.program.concentrations && m.program.concentrations.options.length > 0) {
                              setStep('secondary_concentration');
                            } else {
                              finish(primaryMajor!, primaryConc, m.program.id, null);
                            }
                          }}
                          className="w-full p-2.5 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">{m.program.name}</div>
                            <div className="text-[11px] text-gray-400">{m.overlap} shared</div>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {m.program.total.count} {m.program.total.unit === 'credit_hours' ? 'credits' : 'courses'}
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('secondary_dept')}
                className="w-full p-3 rounded-lg border-2 border-blue-200 bg-blue-50 hover:border-blue-400 text-left transition-all"
              >
                <div className="font-semibold text-sm text-blue-800">Browse all departments</div>
                <div className="text-xs text-blue-600">Pick from the full list</div>
              </button>
              <button
                onClick={() => finish(primaryMajor!, primaryConc, null, null)}
                className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-gray-400 text-left transition-all"
              >
                <div className="font-semibold text-sm text-gray-700">No, just my primary major</div>
                <div className="text-xs text-gray-500">Skip and start planning</div>
              </button>
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
                const backMap: Record<Step, Step | null> = {
                  dept: null,
                  major: 'dept',
                  concentration: 'major',
                  add_secondary: primaryProgram?.concentrations?.options.length ? 'concentration' : 'major',
                  secondary_dept: 'add_secondary',
                  secondary_major: 'secondary_dept',
                  secondary_concentration: 'secondary_major',
                };
                const prev = backMap[step];
                if (prev) setStep(prev);
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
