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
    <nav className="flex gap-2 overflow-x-auto pb-4 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
      {modules.map((module) => {
        const isActive = activeModule === module.id;
        const Icon = module.icon;
        return (
          <button
            key={module.id}
            onClick={() => onSelect(module.id)}
            aria-label={module.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left min-w-max',
              isActive 
                ? 'bg-accent text-white shadow-glow' 
                : 'text-fg-secondary hover:bg-app-subtle hover:text-fg-primary'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{module.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
