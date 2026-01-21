import React from 'react';

import { cn } from '../lib/utils';

type SideNavModule = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SideNavProps = {
  modules: SideNavModule[];
  activeModule: string;
  onSelect: (moduleId: string) => void;
};

export function SideNav({ modules, activeModule, onSelect }: SideNavProps) {
  return (
    <nav className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 pb-6 lg:sticky lg:top-8 lg:flex-col lg:items-center lg:overflow-visible lg:border-b-0 lg:pb-0">
      <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
        G
      </div>
      <div className="flex items-center gap-4 lg:flex-col lg:gap-6">
        {modules.map((module) => {
          const isActive = activeModule === module.id;
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => onSelect(module.id)}
              className={cn(
                'w-12 h-12 flex items-center justify-center rounded-none transition-all group relative',
                isActive ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 font-mono">
                {module.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
