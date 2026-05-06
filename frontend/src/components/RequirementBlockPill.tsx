import { useState, useRef, useEffect } from 'react';
import type { RequirementBlock, Course } from '../types';

interface Props {
  block: RequirementBlock;
  catalog: Record<string, Course>;
  onRemove: () => void;
  onClick: () => void;
}

export default function RequirementBlockPill({ block, catalog, onRemove, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<'left' | 'right'>('right');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hovered && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      setTooltipPos(spaceRight > 320 ? 'right' : 'left');
    }
  }, [hovered]);

  const qualifying = block.qualifying_courses
    .map(id => catalog[id])
    .filter(Boolean)
    .slice(0, 50);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={onClick}
        className="group flex items-center gap-2 px-2.5 py-2 border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 hover:border-purple-400 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-purple-800 truncate">
            Any course fulfilling {block.name}
          </div>
          <div className="text-[10px] text-purple-500">
            {block.qualifying_courses.length} options
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-purple-400 hover:text-purple-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>

      {hovered && (
        <div
          className={`fixed z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-3 ${
            tooltipPos === 'right' ? 'ml-2' : 'mr-2'
          }`}
          style={{
            top: ref.current ? ref.current.getBoundingClientRect().top : 0,
            left: tooltipPos === 'right'
              ? (ref.current ? ref.current.getBoundingClientRect().right + 8 : 0)
              : (ref.current ? ref.current.getBoundingClientRect().left - 296 : 0),
          }}
        >
          <div className="text-xs font-bold text-gray-700 mb-2">
            Courses fulfilling {block.name}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {qualifying.map(c => (
              <div key={c.id} className="text-[11px] text-gray-600 truncate">
                <span className="font-medium">{c.id}</span> — {c.title}
              </div>
            ))}
            {block.qualifying_courses.length > 50 && (
              <div className="text-[10px] text-gray-400 italic">
                + {block.qualifying_courses.length - 50} more courses
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
