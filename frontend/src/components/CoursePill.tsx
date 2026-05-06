import type { Course } from '../types';

interface Props {
  courseId: string;
  course?: Course;
  multiplier?: number;
  onRemove?: () => void;
}

const DEPT_COLORS: Record<string, string> = {
  Biology: 'bg-cyan-500',
  Chemistry: 'bg-violet-500',
  'Biochemistry': 'bg-violet-600',
  Mathematics: 'bg-pink-500',
  'Computer Science': 'bg-emerald-500',
  Psychology: 'bg-orange-500',
  Government: 'bg-indigo-500',
  Economics: 'bg-amber-500',
  Physics: 'bg-slate-500',
  English: 'bg-rose-500',
  History: 'bg-teal-500',
};

export default function CoursePill({ courseId, course, multiplier, onRemove }: Props) {
  if (!course) {
    return (
      <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-400">
        {courseId}
      </div>
    );
  }

  const colorClass = DEPT_COLORS[course.subject] || 'bg-gray-400';

  return (
    <div className="relative group px-3 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing">
      {multiplier && multiplier > 1 && (
        <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          ×{multiplier}
        </span>
      )}
      <div className={`w-1 h-4 rounded-full ${colorClass} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold truncate">{course.id}</div>
        <div className="text-[11px] text-gray-500 truncate">{course.title}</div>
      </div>
      <div className="text-xs text-gray-400 font-medium shrink-0">{course.credits}</div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs ml-1"
        >
          ×
        </button>
      )}
    </div>
  );
}
