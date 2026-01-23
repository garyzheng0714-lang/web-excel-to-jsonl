import React from 'react';

type TopBarProps = {
  label: string;
  title: React.ReactNode;
  countsSlot?: React.ReactNode;
  statusSlot?: React.ReactNode;
};

export function TopBar({ label, title, countsSlot, statusSlot }: TopBarProps) {
  return (
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white font-semibold text-sm">G</span>
          </div>
          <div>
            <p className="text-label">{label}</p>
            <h1 className="text-headline leading-tight">{title}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {statusSlot}
        {countsSlot && (
          <div className="hidden md:flex items-center">
            <div className="w-px h-4 bg-divider mx-2"></div>
            {countsSlot}
          </div>
        )}
        <div className="w-px h-4 bg-divider mx-2 hidden md:block"></div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-app-subtle">
          <span className="status-dot status-success"></span>
          <span className="text-caption">本地运行</span>
        </div>
      </div>
    </div>
  );
}
